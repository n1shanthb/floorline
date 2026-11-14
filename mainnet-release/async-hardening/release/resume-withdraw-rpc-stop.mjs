import assert from "node:assert/strict";
import fs from "node:fs";
import { out, save } from "./execution-rpc.mjs";

const journal = JSON.parse(
  fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, "utf8"),
);
assert.equal(journal.status, "STOPPED_NO_RETRY");
assert.equal(
  journal.error,
  "RPC HTTP 429 https://near-testnet.drpc.org status",
);
assert.equal(journal.rows.length, 13);
assert(journal.rows.every((row) => row.status === "FINAL_VERIFIED"));
assert.equal(journal.rows.at(-1).id, "redeem");
assert.equal(
  journal.rows.at(-1).hash,
  "4gj1BQFmB9wH2NqtZRnTBfdQErdbUDCAQULRTPqojYyd",
);
assert.equal(journal.next.id, "withdraw_redemption");
assert(
  !journal.rows.some((row) =>
    ["SIGNED_NOT_BROADCAST", "BROADCAST_ATTEMPTED"].includes(row.status),
  ),
);
save("RPC_429_WITHDRAW_HASH_STOP.json", journal);
journal.status = "REDEEM_FINAL_VERIFIED_RESUMING_WITHDRAW_HASH_AFTER_COOLDOWN";
journal.recovered_withdraw_rpc_stop = {
  evidence: "RPC_429_WITHDRAW_HASH_STOP.json",
  scope: "read-only status query while reconciling finalized withdrawal hash",
  browser_hash: "EyiBXwpRXnkJmxYCmYT58UpKZzpw57BYs3dkJ6n67ZbA",
  unknown_transactions: 0,
  retried_transactions: 0,
  required_zero_request_cooldown_seconds: 600,
};
delete journal.error;
save("ACCEPTANCE_EXECUTION.json", journal);
console.log(JSON.stringify(journal.recovered_withdraw_rpc_stop));
