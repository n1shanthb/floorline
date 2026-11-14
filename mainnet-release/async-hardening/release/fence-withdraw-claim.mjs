import assert from "node:assert/strict";
import { out, save } from "./execution-rpc.mjs";

const providers = [
  "https://near-testnet.drpc.org",
  "https://test.rpc.fastnear.com",
];
const signer = "funmask6175.testnet";
const publicKey =
  "ed25519:B8mDgWgSh8yhvWbYWJnoSdJuWMbV874Jhk1ewee9zJ94";
const contract = "rc1.floorline-g3-20261111-6702ea.testnet";
const lastFinalizedNonce = 277610782000004;

async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "withdraw-fence", method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  assert(response.ok, `${url} HTTP ${response.status}`);
  const payload = await response.json();
  assert(!payload.error, JSON.stringify(payload.error));
  return payload.result;
}

const block = await rpc(providers[0], "block", { finality: "final" });
const argsBase64 = Buffer.from(JSON.stringify({ claim_id: "1" })).toString(
  "base64",
);
const observations = [];
for (const provider of providers) {
  const accessKey = await rpc(provider, "query", {
    request_type: "view_access_key",
    account_id: signer,
    public_key: publicKey,
    block_id: block.header.hash,
  });
  const rawClaim = await rpc(provider, "query", {
    request_type: "call_function",
    account_id: contract,
    method_name: "get_claim",
    args_base64: argsBase64,
    block_id: block.header.hash,
  });
  const claim = JSON.parse(Buffer.from(rawClaim.result).toString());
  observations.push({ provider, access_key: accessKey, claim });
}

assert.equal(observations[0].access_key.nonce, observations[1].access_key.nonce);
assert.deepEqual(observations[0].claim, observations[1].claim);
assert.equal(observations[0].access_key.nonce, lastFinalizedNonce);
assert.equal(observations[0].claim.owner, signer);
assert.equal(observations[0].claim.amount, "820000000000000000000");
assert.equal(observations[0].claim.state, 0);
assert.equal(observations[0].claim.attempt, "0");

const evidence = {
  conclusion: "SAFE_TO_RETRY_PRE_SIGNING_WALLET_CLOSURE",
  reason:
    "Both alternate providers agree that the signer nonce did not advance beyond the finalized redemption and claim #1 remains Available with no payout attempt.",
  finalized_block: {
    height: block.header.height,
    hash: block.header.hash,
  },
  prior_finalized_transaction: {
    hash: "4gj1BQFmB9wH2NqtZRnTBfdQErdbUDCAQULRTPqojYyd",
    nonce: String(lastFinalizedNonce),
  },
  observations,
  unknown_transactions: 0,
  retried_transactions_before_fence: 0,
};
save("WITHDRAW_CLAIM_PRE_SIGN_NONCE_FENCE.json", evidence);
console.log(JSON.stringify(evidence));
