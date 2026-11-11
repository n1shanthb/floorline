import fs from "node:fs";
import assert from "node:assert/strict";
const endpoint = "https://test.rpc.fastnear.com",
  contract = "floor.floorline-g3-20261111-6702ea.testnet",
  dao = "floorline-g3-20261111-6702ea.sputnikv2.testnet";
async function rpc(method, params) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "frontend-readonly",
      method,
      params,
    }),
  });
  const v = await r.json();
  assert(!v.error, JSON.stringify(v.error));
  return v.result;
}
const status = await rpc("status", []);
assert.equal(status.chain_id, "testnet");
const block = await rpc("block", { finality: "final" });
async function view(account, method, args = {}) {
  const r = await rpc("query", {
    request_type: "call_function",
    account_id: account,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    block_id: block.header.hash,
  });
  return JSON.parse(Buffer.from(r.result));
}
const account = await rpc("query", {
  request_type: "view_account",
  account_id: contract,
  block_id: block.header.hash,
});
assert.equal(account.code_hash, "6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9");
const l = await view(contract, "accounting"),
  meta = await view(contract, "ft_metadata");
assert.equal(meta.decimals, 24);
const c = 10n ** 23n,
  L = BigInt(l.L),
  T = BigInt(l.T),
  tax = BigInt(l.tax_bps),
  q = (L * c * ((10000n - tax) * T + tax * c)) / (10000n * T * T),
  quoted = await view(contract, "quote", { amount: c.toString() });
assert.equal(quoted, q.toString());
assert(BigInt(account.amount) >= BigInt(l.local_required));
const tx = await rpc("tx", {
  tx_hash: "hYYs7XFQATZyNF3DVE97dr7yVCdfJDFmjb5B3mRBicg",
  sender_account_id: "c.floorline-council-a-20261111.testnet",
  wait_until: "FINAL",
});
assert.equal(tx.final_execution_status, "FINAL");
assert(tx.receipts_outcome.every((r) => !r.outcome.status.Failure));
const report = {
  scope:
    "Live read-only frontend integration verification; no keys loaded or transactions submitted",
  checked_at: new Date().toISOString(),
  endpoint,
  chain_id: status.chain_id,
  block: {
    hash: block.header.hash,
    height: block.header.height,
    timestamp_ns: block.header.timestamp_nanosec,
  },
  account,
  ledger: l,
  metadata: meta,
  redemption: {
    amount: c.toString(),
    local_quote: q.toString(),
    contract_quote: quoted,
    match: true,
  },
  solvency_surplus: (
    BigInt(account.amount) - BigInt(l.local_required)
  ).toString(),
  dao: {
    policy: await view(dao, "get_policy"),
    proposal: await view(dao, "get_proposal", { id: 0 }),
  },
  loans: {
    2: await view(contract, "get_loan", { loan_id: "2" }),
    7: await view(contract, "get_loan", { loan_id: "7" }),
  },
  nfts: {
    2: await view(contract, "nft_token", { token_id: "2" }),
    7: await view(contract, "nft_token", { token_id: "7" }),
  },
  historical_dao_execution_recheck: {
    hash: tx.transaction.hash,
    final_execution_status: tx.final_execution_status,
    all_receipts_successful: true,
  },
  contract_unchanged: true,
};
fs.writeFileSync(
  "qa/readonly-integration.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    chain: report.chain_id,
    L: l.L,
    T: l.T,
    quote: quoted,
    solvency_surplus: report.solvency_surplus,
    dao_receipts: "FINAL_ALL_SUCCESS",
    keys_read: false,
    transactions_submitted: 0,
  }),
);
