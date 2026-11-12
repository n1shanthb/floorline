import { useEffect, useState } from "react";
import { ArrowDown, Check, ExternalLink } from "lucide-react";
import { Badge, External, Heading, Row } from "../components/ui";
import Replay from "../components/Replay";
import { daoState } from "../lib/rpc";
import { DAO, DAO_HASH, accountLink, txLink } from "../lib/config";
import { ratio, units } from "../lib/math";
import { useApp } from "../lib/app-context";
import evidence from "../data/evidence.json";
import { policiesEqual } from "../lib/policy";
import GovernanceActions from "../components/GovernanceActions";
export default function Governance() {
  const app = useApp(),
    [data, setData] = useState<Awaited<ReturnType<typeof daoState>> | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void daoState()
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) {
          setData(null);
          setError(e instanceof Error ? e.message : "DAO RPC unavailable");
        }
      });
    return () => {
      live = false;
    };
  }, [app.snapshot]);
  const group = data?.policy.roles.find((r) => r.name === "council")?.kind;
  const members =
    group && typeof group !== "string" && Array.isArray(group.Group)
      ? group.Group
      : data
        ? []
        : evidence.council;
  const exactPolicy =
    data?.account.code_hash === DAO_HASH &&
    policiesEqual(data.policy, evidence.policy);
  const executed = evidence.events.at(-1)!;
  return (
    <>
      <Heading
        title="Decisions that move value"
        description="Watch how a verified DAO contribution changed Floorline’s on-chain backing."
      />
      {error && (
        <div className="notice" role="alert">
          DAO live read unavailable: {error}. The recorded proposal below is
          explicitly historical.
        </div>
      )}
      <div className="governance-grid">
        <section className="card proposal-card">
          <div className="section-head">
            <Badge>PROPOSAL #0</Badge>
            <Badge tone="lime">
              <Check size={12} />
              HISTORICAL EXECUTION
            </Badge>
          </div>
          <h2>Contribute 0.10 NEAR to FLOOR treasury backing.</h2>
          <p className="muted small-copy">
            Sputnik DAO · real FunctionCall execution on NEAR testnet
          </p>
          <div className="council-members">
            {evidence.council.map((member, i) => (
              <div
                className={`council-member ${i ? "approved" : ""}`}
                key={member}
              >
                <span className="avatar">{i ? <Check size={23} /> : "A"}</span>
                <strong>Council {["A", "B", "C"][i]}</strong>
                <small>{i ? "Approved" : "Proposer"}</small>
                <External href={accountLink(member)} className="text-link">
                  Account
                </External>
              </div>
            ))}
          </div>
          <Row label="Verified historical threshold">2 / 3 council members</Row>
          <div className="actions">
            <External href={txLink(executed.tx)}>
              View verified execution
            </External>
            <External href={accountLink(DAO)} className="text-link">
              DAO account
            </External>
          </div>
        </section>
        <section className="card governance-impact lilac">
          <span className="eyebrow">Historical backing per FLOOR</span>
          <div className="previous-ratio">
            {ratio(evidence.history[1].L, evidence.history[1].T, 5)} NEAR
          </div>
          <ArrowDown size={25} />
          <div className="impact-number">
            {ratio(evidence.snapshot.ledger.L, evidence.snapshot.ledger.T, 8)}
          </div>
          <p>
            NEAR per FLOOR after +0.10 NEAR
            <br />
            Supply remained 1.9 FLOOR.
          </p>
          <div className="notice">
            Operator-controlled simulated council. Three distinct accounts do
            not establish independent human governance or community
            decentralization.
          </div>
        </section>
      </div>
      <Replay kind="dao" />
      <GovernanceActions policy={data?.policy} verified={!!exactPolicy} />
      <section className="card dao-inspection">
        <div className="section-head">
          <h3>Inspect the actual policy</h3>
          <Badge tone={data ? "lime" : "white"}>
            {data ? "Current RPC read" : "Historical evidence only"}
          </Badge>
        </div>
        {data ? (
          <>
            <Row label="Proposal #0 current status">{data.proposal.status}</Row>
            <Row label="DAO code matches verified deployment">
              {data.account.code_hash === DAO_HASH
                ? "Yes"
                : "No — inspect change"}
            </Row>
            <Row label="Policy matches demonstrated 2-of-3">
              {exactPolicy ? "Yes" : "No / changed — inspect policy"}
            </Row>
            <Row label="Current proposal bond">
              {units(data.policy.proposal_bond, 24)} NEAR
            </Row>
            <Row label="Wallet voting eligibility">
              {app.account
                ? members.includes(app.account)
                  ? "Council member under fetched policy · eligible proposals checked separately"
                  : "Not a listed council member"
                : "Connect to inspect membership"}
            </Row>
            <details>
              <summary>Current policy and proposal JSON</summary>
              <pre>
                {JSON.stringify(
                  { policy: data.policy, proposal: data.proposal },
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        ) : (
          <p className="muted">
            {error || "Reading deployed DAO policy and proposal…"}
          </p>
        )}
        <p className="footnote">
          <ExternalLink size={12} /> Historical evidence stays read-only. Live
          controls require explicit wallet review and current policy validation.
          Historical B approval left the proposal in progress; C approval
          reached the threshold and the contribution receipt actually succeeded.
        </p>
      </section>
    </>
  );
}
