import assert from "node:assert/strict";
import fs from "node:fs";
import { out, save } from "./execution-rpc.mjs";

const journal = JSON.parse(
  fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, "utf8"),
);
assert.equal(journal.status, "STOPPED_NO_RETRY");
assert.equal(
  journal.error,
  "RPC HTTP 429 https://rpc.testnet.near.org status",
);
assert.equal(journal.rows.length, 12);
assert(journal.rows.every((row) => row.status === "FINAL_VERIFIED"));
assert.equal(journal.rows.at(-1).id, "collateral_to_borrower");
assert.equal(
  journal.rows.at(-1).hash,
  "8m2bHVobQsSpJjRzmuyQaQHiq7x3i1iCsqSJ2cYZxAiK",
);
assert(
  !journal.rows.some((row) =>
    ["SIGNED_NOT_BROADCAST", "BROADCAST_ATTEMPTED"].includes(row.status),
  ),
);
save("RPC_429_REDEEM_HASH_STOP.json", journal);
journal.status = "COLLATERAL_FINAL_VERIFIED_RESUMING_REDEEM_HASH_AFTER_COOLDOWN";
journal.recovered_redeem_rpc_stop = {
  evidence: "RPC_429_REDEEM_HASH_STOP.json",
  scope: "read-only status query while reconciling finalized redemption hash",
  browser_hash: "4gj1BQFmB9wH2NqtZRnTBfdQErdbUDCAQULRTPqojYyd",
  unknown_transactions: 0,
  retried_transactions: 0,
  required_zero_request_cooldown_seconds: 600,
};
delete journal.error;
save("ACCEPTANCE_EXECUTION.json", journal);
console.log(JSON.stringify(journal.recovered_redeem_rpc_stop));
