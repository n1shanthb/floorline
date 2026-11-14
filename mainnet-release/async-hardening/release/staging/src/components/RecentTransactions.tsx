import { useEffect, useState } from "react";
import { readJournal, recordTransaction } from "../lib/journal";
import type { JournalEntry } from "../lib/journal";
import {
  claimById,
  classifyOutcome,
  classifyWithdrawal,
  rpc,
} from "../lib/rpc";
import type { RpcOutcome } from "../lib/rpc";
import { decodeJson } from "../lib/receipt";
import { txLink } from "../lib/config";
import { External } from "./ui";
export default function RecentTransactions() {
  const [entries, setEntries] = useState(readJournal),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const update = () => setEntries(readJournal());
    window.addEventListener("floorline-rc1:activity", update);
    return () => window.removeEventListener("floorline-rc1:activity", update);
  }, []);
  const recheck = async (row: JournalEntry) => {
    setBusy(row.hash);
    setError("");
    try {
      const result = await rpc<RpcOutcome>("tx", {
        tx_hash: row.hash,
        sender_account_id: row.signer,
        wait_until: "FINAL",
      });
      const tx = result.transaction,
        call = tx?.actions?.[0]?.FunctionCall;
      if (
        tx?.hash !== row.hash ||
        tx.signer_id !== row.signer ||
        tx.receiver_id !== row.receiver ||
        tx.actions?.length !== 1 ||
        call?.method_name !== row.method
      )
        throw new Error("Transaction identity mismatch");
      let status = classifyOutcome(result);
      const args = decodeJson(call.args) as Record<string, unknown>;
      if (row.method === "withdraw_claim" && status !== "failed") {
        const claim = await claimById(String(args.claim_id));
        status = classifyWithdrawal(result, claim);
      }
      recordTransaction(
        row.hash,
        row.signer,
        {
          receiver: row.receiver,
          title: row.method,
          method: row.method,
          args,
          deposit: call.deposit,
          gas: String(call.gas),
          details: [],
        },
        status,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Receipt query unavailable");
    } finally {
      setBusy("");
    }
  };
  return (
    <section
      className="card recent-transactions"
      aria-label="This browser transaction history"
    >
      <h3>Your browser’s testnet transactions</h3>
      <p className="footnote">
        Public hashes from this browser’s receipt checks, separate from the
        curated historical replay below. Browser storage is editable and
        incomplete; recheck RPC before trusting a cached status. No live indexer
        is claimed.
      </p>
      {!entries.length && (
        <p className="muted">
          No submitted transaction has been reconciled in this browser.
        </p>
      )}
      {entries.map((row) => (
        <div className="claim-item" key={row.hash}>
          <b>
            {row.method} · last check: {row.status}
          </b>
          <p className="break">
            {row.signer} → {row.receiver}
          </p>
          <External href={txLink(row.hash)}>Inspect transaction</External>
          <button
            className="text-link"
            disabled={!!busy}
            onClick={() => void recheck(row)}
          >
            {busy === row.hash ? "Checking…" : "Recheck final receipts"}
          </button>
        </div>
      ))}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
