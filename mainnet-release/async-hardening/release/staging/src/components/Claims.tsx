import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "../lib/app-context";
import { canonicalId, claimNames, units } from "../lib/math";
import { claimById } from "../lib/rpc";
import type { Claim } from "../lib/rpc";
import { request } from "../lib/actions";
import { Badge, Empty, Row } from "./ui";
export default function Claims() {
  const a = useApp(),
    [claims, setClaims] = useState<Claim[]>([]),
    [id, setId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    if (!a.account) {
      setClaims([]);
      return;
    }
    setBusy(true);
    void Promise.all(a.tracked.claims.map((id) => claimById(id)))
      .then((c) => {
        if (live) {
          setClaims(
            c.filter((v): v is Claim => v !== null && v.owner === a.account),
          );
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Claim reads failed");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [a.account, a.tracked.claims, a.snapshot, nonce]);
  const find = async () => {
    if (!canonicalId(id)) {
      setError("Use a canonical numeric claim ID.");
      return;
    }
    try {
      const c = await claimById(id);
      if (!c) throw new Error("No claim exists at that ID.");
      if (c.owner !== a.account)
        throw new Error("That claim belongs to another account.");
      a.trackId("claims", id);
      setId("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim lookup failed");
    }
  };
  return (
    <div className="claims">
      <div className="section-head">
        <h3>Native payout claims</h3>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => setNonce((n) => n + 1)}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>
      <p className="muted small-copy">
        Redemption, borrowing and repayment create separate native claims. A
        successful action is not the same as a completed payout.
      </p>
      {!a.account ? (
        <Empty title="Your claims, in one place">
          <button className="button primary" onClick={a.openWallet}>
            Connect wallet
          </button>
        </Empty>
      ) : (
        <>
          <label className="field-label" htmlFor="claim-id">
            Find a claim by ID
          </label>
          <div className="inline-form">
            <input
              id="claim-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 0"
            />
            <button
              className="button secondary"
              onClick={() => void find()}
              disabled={!id}
            >
              Look up
            </button>
          </div>
          <p className="footnote">
            Partial discovery: known demo IDs and IDs saved in this browser
            only. The contract has no claims enumeration method.
          </p>
          {busy && <p role="status">Reading tracked claims…</p>}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {claims.length === 0 && !busy && !error && (
            <Empty title="No tracked claims for this wallet">
              Look up a claim ID from your transaction receipt.
            </Empty>
          )}
          {claims.map((c) => (
            <div className="claim-item" key={c.id}>
              <div className="section-head">
                <b>Claim #{c.id}</b>
                <Badge tone={c.state === 3 ? "lime" : "violet"}>
                  {claimNames[c.state] || "Unknown"}
                </Badge>
              </div>
              <Row label="Amount">{units(c.amount, 12)} NEAR</Row>
              {c.state === 0 && (
                <button
                  className="button primary full"
                  onClick={() =>
                    a.review(
                      request(
                        "Withdraw native claim",
                        "withdraw_claim",
                        { claim_id: c.id },
                        "0",
                        [
                          `Withdraw ${units(c.amount, 24)} NEAR to the claim owner.`,
                          `Claim #${c.id}; 110 Tgas for transfer and callback.`,
                        ],
                        "Only a verified paid callback is treated as payout success.",
                      ),
                    )
                  }
                >
                  Review withdrawal
                </button>
              )}
              {c.state === 1 && (
                <p className="notice">
                  Transfer or callback unresolved. No safe retry is available;
                  inspect the original receipt.
                </p>
              )}
              {c.state === 2 && (
                <button
                  className="button secondary full"
                  onClick={() =>
                    a.review(
                      request(
                        "Restore known failed claim",
                        "retry_failed_claim",
                        { claim_id: c.id },
                        "0",
                        [
                          "Requires confirmed failure and enough returned cash.",
                          "This restores availability; withdrawal is a separate transaction.",
                        ],
                      ),
                    )
                  }
                >
                  Review known-failure recovery
                </button>
              )}
              {c.state === 3 && (
                <p className="footnote">
                  The contract records this claim as paid. No repeat withdrawal.
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
