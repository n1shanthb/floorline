import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { block, final, out, query, receipts, rpc, save, urls } from './execution-rpc.mjs';

const require = createRequire('E:/near-2/runtime/package.json');
const api = require('near-api-js');

const OLD_HOLDER = 'alice.floorline-g3-20261111-6702ea.testnet';
const NEW_HOLDER = 'funmask6175.testnet';
const NEW_HOLDER_KEY = 'ed25519:B8mDgWgSh8yhvWbYWJnoSdJuWMbV874Jhk1ewee9zJ94';
const TRANSFER = 1_900_000_000_000_000_000_000_000n;
const CONTRACT = 'rc1.floorline-g3-20261111-6702ea.testnet';
const journalFile = `${out}/HOLDER_REPLACEMENT.json`;
const credentials = 'E:/near-2/.testnet-credentials';

assert(!fs.existsSync(journalFile), 'HOLDER_REPLACEMENT.json already exists; never resend automatically');
const execution = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, 'utf8'));
assert.equal(execution.status, 'AWAITING_BROWSER_ISSUE');
assert.equal(execution.rows.length, 9);
assert.equal(execution.pre_browser.ledger.L, '0');
assert.equal(execution.pre_browser.ledger.T, '0');

const keyStore = new api.keyStores.UnencryptedFileSystemKeyStore(credentials);
const near = await api.connect({ networkId: 'testnet', nodeUrl: urls[0], deps: { keyStore } });
const oldKey = await near.connection.signer.getPublicKey(OLD_HOLDER, 'testnet');
assert.equal(oldKey?.toString(), 'ed25519:GtyU6hQZ6iZRm4HS57Hmhd1TyAYvbZRuMBru7s2ZYWHz');

const view = async (method, args, at) => JSON.parse(Buffer.from((await query({
  request_type: 'call_function', account_id: CONTRACT, method_name: method,
  args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
}, at)).result).toString());

async function snapshot() {
  const at = await block();
  const oldAccount = await query({ request_type: 'view_account', account_id: OLD_HOLDER }, at);
  const newAccount = await query({ request_type: 'view_account', account_id: NEW_HOLDER }, at);
  const newKeys = await query({ request_type: 'view_access_key_list', account_id: NEW_HOLDER }, at);
  const ledger = await view('accounting', {}, at);
  const oldUser = await view('user_state', { account_id: OLD_HOLDER }, at);
  const oldStorage = await view('storage_balance_of', { account_id: OLD_HOLDER }, at);
  const newUser = await view('user_state', { account_id: NEW_HOLDER }, at);
  const newStorage = await view('storage_balance_of', { account_id: NEW_HOLDER }, at);
  assert.equal(ledger.L, '0'); assert.equal(ledger.T, '0'); assert.equal(ledger.inflight, '0');
  return { at, oldAccount, newAccount, newKeys, ledger, oldUser, oldStorage, newUser, newStorage };
}

const journal = {
  network: 'testnet', contract: CONTRACT, old_holder: OLD_HOLDER, new_holder: NEW_HOLDER,
  authorization: 'Owner authorized replacing Alice and sending the already-approved holder allocation to new Funmask in chat on 2026-11-14.',
  ceiling_yocto: '13240000000000000000000000', transfer_yocto: TRANSFER.toString(),
  status: 'PREPARED_NOT_SIGNED', rows: [], before: await snapshot(),
};
assert.equal(journal.before.newAccount.amount, '0');
assert.deepEqual(journal.before.newKeys.keys.map(k => k.public_key), [NEW_HOLDER_KEY]);
assert(journal.before.newKeys.keys.every(k => k.access_key.permission === 'FullAccess'));
assert.equal(journal.before.oldUser.tokens, '0'); assert.equal(journal.before.oldUser.refs, 0);
assert.equal(journal.before.oldUser.refund_state, 0); assert.equal(journal.before.oldStorage.total, '20000000000000000000000');
save('HOLDER_REPLACEMENT.json', journal);

async function submit(id, receiver, actions, extra = {}) {
  const at = await block();
  const access = await query({ request_type: 'view_access_key', account_id: OLD_HOLDER, public_key: oldKey.toString() }, at);
  assert.equal(access.permission, 'FullAccess');
  const [hashBytes, signed] = await api.transactions.signTransaction(
    receiver, BigInt(access.nonce) + 1n, actions, api.utils.serialize.base_decode(at.hash),
    near.connection.signer, OLD_HOLDER, 'testnet',
  );
  const hash = api.utils.serialize.base_encode(hashBytes);
  const row = { id, signer: OLD_HOLDER, receiver, hash, nonce: (BigInt(access.nonce) + 1n).toString(), status: 'SIGNED_NOT_BROADCAST', signed_tx_base64: Buffer.from(signed.encode()).toString('base64'), ...extra };
  journal.rows.push(row); save('HOLDER_REPLACEMENT.json', journal);
  row.status = 'BROADCAST_ATTEMPTED'; save('HOLDER_REPLACEMENT.json', journal);
  row.broadcast = await rpc(urls[0], 'send_tx', { signed_tx_base64: row.signed_tx_base64, wait_until: 'NONE' });
  save('HOLDER_REPLACEMENT.json', journal);
  row.outcome = await final(hash, OLD_HOLDER);
  row.fee = receipts(row.outcome).toString();
  assert.equal(row.outcome.transaction.hash, hash);
  assert.equal(row.outcome.transaction.signer_id, OLD_HOLDER);
  assert.equal(row.outcome.transaction.receiver_id, receiver);
  row.status = 'FINAL_VERIFIED'; save('HOLDER_REPLACEMENT.json', journal);
  return row;
}

journal.status = 'UNREGISTERING_OLD_HOLDER'; save('HOLDER_REPLACEMENT.json', journal);
const unreg = await submit('unregister_old_holder', CONTRACT, [api.transactions.functionCall('storage_unregister', Buffer.from('{"force":false}'), 110_000_000_000_000n, 1n)], { method: 'storage_unregister', deposit: '1' });
assert.equal(unreg.outcome.status.SuccessValue, 'dHJ1ZQ==');
const afterUnregister = await snapshot();
assert.equal(afterUnregister.oldStorage, null); assert.equal(afterUnregister.oldUser, null);
assert.equal(afterUnregister.ledger.storage_total, '60000000000000000000000');
journal.after_unregister = afterUnregister; save('HOLDER_REPLACEMENT.json', journal);

journal.status = 'TRANSFERRING_REUSED_HOLDER_ALLOCATION'; save('HOLDER_REPLACEMENT.json', journal);
const transfer = await submit('fund_new_holder', NEW_HOLDER, [api.transactions.transfer(TRANSFER)], { deposit: TRANSFER.toString() });
const after = await snapshot();
assert.equal(BigInt(after.newAccount.amount) - BigInt(journal.before.newAccount.amount), TRANSFER);
assert.equal(after.ledger.L, '0'); assert.equal(after.ledger.T, '0'); assert.equal(after.ledger.storage_total, '60000000000000000000000');
journal.after = after;
journal.total_fees = journal.rows.reduce((n, row) => n + BigInt(row.fee), 0n).toString();
journal.status = 'FINAL_VERIFIED_AWAITING_NEW_HOLDER_STORAGE_REGISTRATION';
save('HOLDER_REPLACEMENT.json', journal);
console.log(JSON.stringify({ status: journal.status, new_holder: NEW_HOLDER, transfer_yocto: TRANSFER.toString(), hashes: journal.rows.map(r => ({ id: r.id, hash: r.hash, fee: r.fee })), old_balance: after.oldAccount.amount, new_balance: after.newAccount.amount, storage_total: after.ledger.storage_total }, null, 2));
