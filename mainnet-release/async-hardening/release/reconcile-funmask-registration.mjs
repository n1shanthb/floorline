import assert from 'node:assert/strict';
import fs from 'node:fs';
import { block, final, out, query, receipts, save } from './execution-rpc.mjs';

const hash = process.argv[2];
assert.equal(hash, 'SwTUrnrWmt7TrJdRExCndek5ndxXFsDNBypXGWgy6Cy', 'Unexpected browser transaction hash');
const contract = 'rc1.floorline-g3-20261111-6702ea.testnet';
const holder = 'funmask6175.testnet';
const executionFile = `${out}/ACCEPTANCE_EXECUTION.json`;
const replacementFile = `${out}/HOLDER_REPLACEMENT.json`;
const execution = JSON.parse(fs.readFileSync(executionFile, 'utf8'));
const replacement = JSON.parse(fs.readFileSync(replacementFile, 'utf8'));
assert.equal(execution.status, 'HOLDER_REPLACED_AWAITING_NEW_HOLDER_REGISTRATION');
assert(!execution.rows.some(row => row.hash === hash || row.id === 'register_new_holder'));
assert.equal(replacement.status, 'FINAL_VERIFIED_AWAITING_NEW_HOLDER_STORAGE_REGISTRATION');

const outcome = await final(hash, holder);
assert.equal(outcome.transaction.signer_id, holder);
assert.equal(outcome.transaction.receiver_id, contract);
assert.equal(outcome.transaction.actions.length, 1);
const call = outcome.transaction.actions[0].FunctionCall;
assert(call);
assert.equal(call.method_name, 'storage_deposit');
assert.equal(call.deposit, '20000000000000000000000');
assert.equal(call.gas, 110_000_000_000_000);
assert.deepEqual(JSON.parse(Buffer.from(call.args, 'base64')), { account_id: null, registration_only: false });
assert.deepEqual(JSON.parse(Buffer.from(outcome.status.SuccessValue, 'base64')), {
  total: '20000000000000000000000', available: '15380000000000000000000',
});
const fee = receipts(outcome).toString();

const at = await block();
const view = async (method, args) => JSON.parse(Buffer.from((await query({
  request_type: 'call_function', account_id: contract, method_name: method,
  args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
}, at)).result).toString());
const storage = await view('storage_balance_of', { account_id: holder });
const user = await view('user_state', { account_id: holder });
const ledger = await view('accounting', {});
const admission = await view('admission_status', {});
const balance = await view('ft_balance_of', { account_id: holder });
assert.equal(storage.total, '20000000000000000000000');
assert.equal(storage.available, '15380000000000000000000');
assert.equal(user.tokens, '0'); assert.equal(user.refs, 0); assert.equal(user.refund_state, 0);
assert.equal(balance, '0'); assert.equal(ledger.L, '0'); assert.equal(ledger.T, '0');
assert.equal(ledger.storage_total, '80000000000000000000000');
assert.equal(ledger.inflight, '0'); assert.equal(ledger.refund_storage, '0');
assert.equal(admission.occupied, 4);

const row = {
  id: 'register_new_holder', role: 'holder', signer: holder, receiver: contract, hash,
  status: 'FINAL_VERIFIED', method: 'storage_deposit',
  args: { account_id: null, registration_only: false },
  deposit: '20000000000000000000000', gas: '110000000000000', fee,
  browser: true, outcome,
};
execution.rows.push(row);
execution.status = 'AWAITING_BROWSER_ISSUE';
execution.current_holder = holder;
execution.browser_registration = 'SIGNED_RECEIPT_AND_ALL_DESCENDANTS_FINAL_VERIFIED';
execution.current_snapshot = { at, ledger, admission, holder_storage: storage, holder_user: user, holder_balance: balance };
execution.pre_browser_snapshot_status = 'HISTORICAL_BEFORE_HOLDER_REPLACEMENT';
save('ACCEPTANCE_EXECUTION.json', execution);

replacement.registration = row;
replacement.after_registration = execution.current_snapshot;
replacement.total_fees_including_registration = (BigInt(replacement.total_fees) + BigInt(fee)).toString();
replacement.status = 'FINAL_VERIFIED_HOLDER_REPLACED_AND_REGISTERED';
save('HOLDER_REPLACEMENT.json', replacement);
console.log(JSON.stringify({ hash, fee, holder, storage, admission, L: ledger.L, T: ledger.T, status: execution.status }, null, 2));
