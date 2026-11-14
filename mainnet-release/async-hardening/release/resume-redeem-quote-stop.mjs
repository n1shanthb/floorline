import assert from "node:assert/strict";
import fs from "node:fs";
import { out, save } from "./execution-rpc.mjs";

const journal = JSON.parse(
  fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, "utf8"),
);
assert.equal(journal.status, "STOPPED_NO_RETRY");
assert.match(journal.error, /820000000000000000000/);
assert.match(journal.error, /838666666666666666666/);
assert.equal(journal.rows.length, 12);
assert(journal.rows.every((row) => row.status === "FINAL_VERIFIED"));
assert.equal(journal.next.id, "redeem");
assert.equal(journal.next.args.min_out, "820000000000000000000");
assert(
  !journal.rows.some((row) =>
    ["SIGNED_NOT_BROADCAST", "BROADCAST_ATTEMPTED"].includes(row.status),
  ),
);
save("REDEEM_POST_STATE_REQUOTE_STOP.json", journal);
journal.status = "COLLATERAL_FINAL_VERIFIED_RESUMING_WITH_PINNED_REDEEM_QUOTE";
journal.redeem_quote_reconciliation = {
  evidence: "REDEEM_POST_STATE_REQUOTE_STOP.json",
  pinned_pre_signing_min_out: journal.next.args.min_out,
  post_redemption_quote_not_used: "838666666666666666666",
  transaction_hash: "4gj1BQFmB9wH2NqtZRnTBfdQErdbUDCAQULRTPqojYyd",
  unknown_transactions: 0,
  retried_transactions: 0,
};
delete journal.error;
save("ACCEPTANCE_EXECUTION.json", journal);
console.log(JSON.stringify(journal.redeem_quote_reconciliation));
