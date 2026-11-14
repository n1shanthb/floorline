import assert from "node:assert/strict";
import fs from "node:fs";
import { final, out, receipts, save } from "./execution-rpc.mjs";

const journal = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, "utf8"));
assert.equal(journal.status, "STOPPED_NO_RETRY");
assert.equal(journal.error, "RPC HTTP 408 https://near-testnet.drpc.org tx");
assert.equal(journal.graph, "0ded3648e33d9e166fc855e94bbc4970174a455cf48bb77f2b93acb77680a9f5");
const row = journal.rows.at(-1);
assert.equal(row.id, "withdraw_principal");
assert.equal(row.status, "BROADCAST_ATTEMPTED");
assert.equal(row.hash, "EbxKcJ51CbBtqBxn4PWcMmf2Mf7A2oRY9dpMn9waeV3U");
assert.equal(row.signer, "carol.floorline-g3-20261111-6702ea.testnet");
assert.equal(row.receiver, "rc1.floorline-g3-20261111-6702ea.testnet");
assert.equal(row.method, "withdraw_claim");
assert.deepEqual(row.args, { claim_id: "4" });
assert.equal(row.deposit, "0");
assert.equal(row.nonce, "277184559000012");
assert.equal(typeof row.signed_tx_base64, "string");
assert(row.signed_tx_base64.length > 0);

save("RPC_408_WITHDRAW_PRINCIPAL_STOP.json", journal);
const outcome = await final(row.hash, row.signer);
assert.equal(outcome.transaction.hash, row.hash);
assert.equal(outcome.transaction.signer_id, row.signer);
assert.equal(outcome.transaction.receiver_id, row.receiver);
assert.equal(outcome.transaction.nonce.toString(), row.nonce);
assert.equal(outcome.transaction.actions.length, 1);
const call = outcome.transaction.actions[0].FunctionCall;
assert.equal(call.method_name, row.method);
assert.equal(call.deposit, row.deposit);
assert.equal(call.gas.toString(), "110000000000000");
assert.deepEqual(JSON.parse(Buffer.from(call.args, "base64")), row.args);
row.outcome = outcome;
row.fee = receipts(outcome).toString();
row.value = JSON.parse(Buffer.from(outcome.status.SuccessValue, "base64").toString() || "null");
row.status = "FINAL_VERIFIED";
journal.values[row.id] = row.value;
journal.recovered_withdraw_principal_408 = {
  evidence: "RPC_408_WITHDRAW_PRINCIPAL_STOP.json",
  original_hash: row.hash,
  classification: "FINAL_SUCCESS",
  root_and_all_descendants: "FINAL_VERIFIED",
  unknown_transactions: 0,
  rebroadcasts: 0,
};
journal.status = "RUNNING";
delete journal.error;
save("WITHDRAW_PRINCIPAL_FINAL_RECONCILIATION.json", { row, recovery: journal.recovered_withdraw_principal_408 });
save("ACCEPTANCE_EXECUTION.json", journal);
console.log(JSON.stringify(journal.recovered_withdraw_principal_408));
