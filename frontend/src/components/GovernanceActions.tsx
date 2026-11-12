import { useEffect, useState } from "react";
import { useApp } from "../lib/app-context";
import { daoState } from "../lib/rpc";
import type { DaoPolicy, DaoProposal } from "../lib/rpc";
import {
  contributionAmount,
  proposalRequest,
  voteRequest,
} from "../lib/governance-actions";
import { exact } from "../lib/math";
export default function GovernanceActions({
  policy,
  verified,
}: {
  policy?: DaoPolicy;
  verified: boolean;
}) {
  const app = useApp(),
    [id, setId] = useState("0"),
    [proposal, setProposal] = useState<DaoProposal | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const inspectedId = proposal?.id;
  useEffect(() => {
    if (inspectedId === undefined) return;
    let current = true;
    void daoState(inspectedId)
      .then((d) => {
        if (current) setProposal(d.proposal);
      })
      .catch((e) => {
        if (current) {
          setProposal(null);
          setError(e instanceof Error ? e.message : "Proposal refresh failed");
        }
      });
    return () => {
      current = false;
    };
  }, [app.snapshot, inspectedId]);
  const group = policy?.roles.find((r) => r.name === "council")?.kind;
  const council =
    typeof group === "object" && group.Group.includes(app.account);
  let amount = "",
    supported = false;
  try {
    if (proposal) {
      amount = exact(contributionAmount(proposal.kind));
      supported = true;
    }
  } catch {
    /* Unsupported proposals remain read-only. */
  }
  const expired =
    proposal &&
    policy?.proposal_period &&
    proposal.submission_time &&
    app.snapshot
      ? BigInt(app.snapshot.timestampNs) >=
        BigInt(proposal.submission_time) + BigInt(policy.proposal_period)
      : true;
  const canVote =
    verified &&
    council &&
    supported &&
    proposal?.status === "InProgress" &&
    !proposal.votes[app.account] &&
    !expired;
  return (
    <section
      className="card governance-actions"
      aria-label="Live Sputnik governance controls"
    >
      <h3>Live testnet governance</h3>
      <p className="footnote">
        These controls prepare real wallet transactions. The animation above is
        historical. Operator-controlled simulated council; no
        independent-human-governance claim.
      </p>
      {!app.account ? (
        <button className="button secondary" onClick={app.openWallet}>
          Connect wallet for governance
        </button>
      ) : (
        <button
          className="button secondary"
          disabled={!verified || !!app.error}
          onClick={() => app.review(proposalRequest(policy!.proposal_bond))}
        >
          Review new 0.10 NEAR proposal
        </button>
      )}
      <p className="footnote">
        Current proposal bond:{" "}
        {policy ? exact(policy.proposal_bond) : "awaiting RPC"} NEAR, separate
        from the DAO contribution. Creation does not execute the contribution.
      </p>
      <label className="field-label" htmlFor="live-proposal-id">
        Live proposal ID
      </label>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^(0|[1-9]\d*)$/.test(id) || !Number.isSafeInteger(Number(id))) {
            setError("Use a safe nonnegative proposal ID.");
            return;
          }
          setBusy(true);
          setProposal(null);
          void daoState(Number(id))
            .then((d) => {
              setProposal(d.proposal);
              setError("");
            })
            .catch((e) =>
              setError(e instanceof Error ? e.message : "Proposal unavailable"),
            )
            .finally(() => setBusy(false));
        }}
      >
        <input
          id="live-proposal-id"
          inputMode="numeric"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setProposal(null);
          }}
        />
        <button className="button secondary" disabled={busy} type="submit">
          {busy ? "Reading…" : "Inspect live proposal"}
        </button>
      </form>
      {proposal && (
        <>
          <p>
            Status: {proposal.status}.{" "}
            {supported
              ? `Floorline contribution: ${amount} NEAR.`
              : "Unsupported proposal type: read-only."}
          </p>
          <p className="footnote">
            {canVote
              ? "Council approval is available after a fresh policy, balance and expiry check."
              : "Approval unavailable: requires an eligible unvoted council account, supported in-progress proposal and active voting period."}
          </p>
          {canVote && (
            <button
              className="button primary"
              onClick={() => app.review(voteRequest(Number(id), proposal))}
            >
              Review council approval
            </button>
          )}
        </>
      )}
      {!verified && (
        <p className="notice">
          DAO controls are blocked until live code and the full policy match the
          verified deployment.
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
