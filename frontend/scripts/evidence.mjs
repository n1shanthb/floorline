import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "../.."),
  d = JSON.parse(fs.readFileSync(path.join(root, "TESTNET_EVIDENCE.json"))),
  refs = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        "floorline-ux-reference-pack/spec/VERIFIED_DEMO_EVENTS.json",
      ),
    ),
  );
const all = [...d.transactions, ...d.dao.transactions];
const events = refs.events.map((event) => {
  const tx = all.find((t) => t.hash === event.tx);
  assert(tx?.explorer_index_verified);
  assert(!tx.outcome.status.Failure);
  return {
    ...event,
    sourceTitle: event.title,
    title:
      event.id === "loan-default"
        ? "Loan #7 default settled; NFT burned"
        : event.title,
    signer: tx.signer,
    receiver: tx.receiver,
    method:
      tx.method ||
      tx.outcome.transaction.actions[0]?.FunctionCall?.method_name ||
      tx.name,
    deposit:
      tx.attached_deposit_yocto ||
      tx.outcome.transaction.actions[0]?.FunctionCall?.deposit ||
      "0",
    recordedAt: tx.completed_at,
    receiptCount: tx.outcome.receipts_outcome.length,
    receipts: tx.outcome.receipts_outcome.map((r) => ({
      id: r.id,
      executor: r.outcome.executor_id,
      status: r.outcome.status,
      logs: r.outcome.logs,
    })),
    before: tx.before?.ledger || tx.before_floor?.ledger,
    after: tx.after?.ledger || tx.after_floor?.ledger,
  };
});
const find = (n) => d.transactions.find((t) => t.name === n);
const history = ["alice_issue", "bob_redeem"].map((name) => ({
  label: name === "alice_issue" ? "Initial issuance" : "After redemption",
  L: find(name).after.ledger.L,
  T: find(name).after.ledger.T,
  hash: find(name).hash,
}));
history.push({
  label: "DAO contribution",
  L: d.post_dao_final_state.ledger.L,
  T: d.post_dao_final_state.ledger.T,
  hash: events.at(-1).tx,
});
const output = {
  label: "Verified historical testnet evidence · not live",
  network: "testnet",
  contract: d.actual_accounts.floor,
  dao: d.dao.dao,
  recordedAt: d.dao.finished_at,
  events,
  history,
  snapshot: d.post_dao_final_state,
  council: d.dao.council,
  policy: d.dao.policy,
  proposal: d.dao.final_proposal,
  loanIds: [find("lender_offer").value, find("default_offer").value],
  claimIds: ["bob_redeem", "carol_accept", "dave_repay", "default_accept"].map(
    (n) => find(n).value,
  ),
  loans: d.independent_final_verification.loans,
};
fs.writeFileSync(
  path.join(root, "frontend/src/data/evidence.json"),
  JSON.stringify(output, null, 2),
);
fs.writeFileSync(
  path.join(root, "frontend/public/demo-evidence.json"),
  JSON.stringify(output, null, 2),
);
for (const name of [
  "ECONOMIC_INVARIANTS.md",
  "STANDARDS_COMPLIANCE.md",
  "DAO_DEMONSTRATION.md",
]) {
  fs.mkdirSync(path.join(root, "frontend/public/docs"), { recursive: true });
  fs.copyFileSync(
    path.join(root, name),
    path.join(root, "frontend/public/docs", name),
  );
}
console.log(
  "Exported validated public evidence only: seven finalized indexed events, actual loan IDs 2 and 7",
);
