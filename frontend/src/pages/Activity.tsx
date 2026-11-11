import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, RefreshCw } from "lucide-react";
import {
  Badge,
  CopyButton,
  External,
  Heading,
  Row,
  Tabs,
} from "../components/ui";
import { EventIcon } from "../components/activity";
import { txLink } from "../lib/config";
import { ratio, units } from "../lib/math";
import { classifyOutcome, rpc } from "../lib/rpc";
import type { RpcOutcome } from "../lib/rpc";
import evidence from "../data/evidence.json";
const filters = [
  "All activity",
  "Treasury",
  "Loans",
  "NFT transfers",
  "Governance",
] as const;
export default function Activity() {
  const [filter, setFilter] =
      useState<(typeof filters)[number]>("All activity"),
    [params, setParams] = useSearchParams(),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const selected =
    evidence.events.find((e) => e.id === params.get("event")) ||
    evidence.events.at(-1)!;
  const events = [...evidence.events]
    .reverse()
    .filter(
      (e) =>
        filter === "All activity" ||
        (filter === "Treasury" &&
          ["issuance", "redemption"].includes(e.kind)) ||
        (filter === "Loans" && e.kind.startsWith("loan")) ||
        (filter === "NFT transfers" && e.kind === "nft_transfer") ||
        (filter === "Governance" && e.kind.startsWith("dao")),
    );
  const check = async () => {
    setBusy(true);
    try {
      const outcome = await rpc<RpcOutcome>("tx", {
        tx_hash: selected.tx,
        sender_account_id: selected.signer,
        wait_until: "FINAL",
      });
      if (
        outcome.transaction?.hash !== selected.tx ||
        outcome.transaction?.signer_id !== selected.signer ||
        outcome.transaction?.receiver_id !== selected.receiver
      )
        throw new Error("Transaction identity mismatch");
      const result = classifyOutcome(outcome);
      setStatus(
        result === "confirmed"
          ? "Final RPC receipts rechecked successfully. This is still a historical transaction."
          : `RPC result: ${result}. Inspect all receipts; no live transaction was sent.`,
      );
    } catch (e) {
      setStatus(
        `RPC recheck unavailable: ${e instanceof Error ? e.message : "Unknown"}. Recorded verified evidence remains available.`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Receipts, not promises"
        description="Every important protocol moment is verifiable on NEAR testnet."
      />
      <div className="activity-toolbar">
        <Tabs
          values={[...filters]}
          value={filter}
          onChange={setFilter}
          label="Activity filters"
        />
        <a
          className="button secondary small"
          href="/demo-evidence.json"
          download
        >
          <Download size={14} />
          Public evidence
        </a>
      </div>
      <div className="activity-grid">
        <section
          className="card event-list activity-feed"
          aria-label="Historical testnet events"
        >
          <div className="feed-label">
            <Badge tone="lime">Verified historical testnet evidence</Badge>
          </div>
          {events.map((event) => (
            <button
              className={`event-row ${selected.id === event.id ? "selected" : ""}`}
              key={event.id}
              onClick={() => {
                setParams({ event: event.id });
                setStatus("");
              }}
            >
              <EventIcon kind={event.kind} />
              <span className="event-body">
                <strong>
                  {event.id === "dao-vote-c"
                    ? "DAO contributed 0.10 NEAR"
                    : event.id === "loan-default"
                      ? "Loan #7 default settled · NFT burned"
                      : event.title}
                </strong>
                <small>
                  {event.id === "dao-vote-c"
                    ? "Two approvals · FunctionCall executed"
                    : "Historical finalized transaction · not live"}
                </small>
              </span>
              <span className="event-view">
                {selected.id === event.id ? "Selected" : "Inspect"} →
              </span>
            </button>
          ))}
        </section>
        <section
          className="card receipt-detail"
          aria-label="Selected receipt details"
        >
          <Badge tone="lime">✓ VERIFIED TESTNET · REPLAY EVIDENCE</Badge>
          <h2>
            {selected.id === "dao-vote-c"
              ? "DAO treasury contribution"
              : selected.title}
          </h2>
          <Row label="Network">NEAR testnet</Row>
          <Row label="Recorded method">{selected.method}</Row>
          <Row label="Parent attached deposit">
            {units(selected.deposit, 24)} NEAR
          </Row>
          {selected.id === "dao-vote-c" && (
            <>
              <Row label="Executed contribution">+0.10 NEAR</Row>
              <Row label="Floorline contribution receipt">
                <span className="mono break">
                  4aMh8cSjwbvjCz8r3gfpw9jZmVzNDuJu7wLpvjNYKFiw
                </span>
              </Row>
            </>
          )}
          {selected.before && (
            <>
              <Row label="Backing before">
                {units(selected.before.L, 12)} NEAR
              </Row>
              <Row label="Backing after">
                {units(selected.after.L, 12)} NEAR
              </Row>
              <Row label="Backing / FLOOR after">
                {ratio(selected.after.L, selected.after.T, 12)} NEAR
              </Row>
            </>
          )}
          <Row label="Signer">
            <span className="break">{selected.signer}</span>
          </Row>
          <Row label="Receiver">
            <span className="break">{selected.receiver}</span>
          </Row>
          <Row label="Execution TX">
            <span className="mono break">{selected.tx}</span>
          </Row>
          <Row label="Captured receipt outcomes">{selected.receiptCount}</Row>
          <External
            className="button primary full"
            href={`https://api-testnet.nearblocks.io/v3/txns/${selected.tx}`}
          >
            Open indexed transaction data
          </External>
          <div className="receipt-buttons">
            <CopyButton value={selected.tx} label="Copy transaction hash" />
            <External
              href={txLink(selected.tx)}
              className="button secondary small"
            >
              Explorer
            </External>
          </div>
          <button
            className="text-link"
            onClick={() => void check()}
            disabled={busy}
          >
            <RefreshCw size={13} className={busy ? "spin" : ""} />
            Recheck final RPC receipts
          </button>
          {status && (
            <p className="notice" role="status">
              {status}
            </p>
          )}
          <details className="raw">
            <summary>Receipt outcomes and event logs</summary>
            <pre>{JSON.stringify(selected.receipts, null, 2)}</pre>
          </details>
          <p className="footnote">
            Local public evidence validated against repository hashes and
            finalized receipts. Captured{" "}
            {new Date(selected.recordedAt).toLocaleString()}; this is capture
            time, not an invented execution timestamp. Canonical explorer HTML
            rendering was not verified; indexed JSON hashes/signers/receivers
            were verified.
          </p>
        </section>
      </div>
    </>
  );
}
