import assert from 'node:assert/strict';
import fs from 'node:fs';
import { block, final, out, query, receipts, save } from './execution-rpc.mjs';

const hash = process.argv[2];
assert.equal(hash, '63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm', 'Unexpected browser transaction hash');
const contract = 'rc1.floorline-g3-20261111-6702ea.testnet';
const holder = 'funmask6175.testnet';
const file = `${out}/ACCEPTANCE_EXECUTION.json`;
const execution = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(execution.status, 'AWAITING_BROWSER_ISSUE');
assert(!execution.rows.some(row => row.hash === hash || row.id === 'issue'));

const outcome = await final(hash, holder);
assert.equal(outcome.transaction.signer_id, holder);
assert.equal(outcome.transaction.receiver_id, contract);
assert.equal(outcome.transaction.actions.length, 1);
const call = outcome.transaction.actions[0].FunctionCall;
assert(call);
assert.equal(call.method_name, 'issue');
assert.equal(call.deposit, '10000000000000000000000');
assert.equal(call.gas, 110_000_000_000_000);
assert.deepEqual(JSON.parse(Buffer.from(call.args, 'base64')), { min_tokens: '10000000000000000000000' });
assert.equal(JSON.parse(Buffer.from(outcome.status.SuccessValue, 'base64')), '10000000000000000000000');
const fee = receipts(outcome).toString();

const at = await block();
const view = async (method, args) => JSON.parse(Buffer.from((await query({
  request_type: 'call_function', account_id: contract, method_name: method,
  args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
}, at)).result).toString());
const ledger = await view('accounting', {});
const pilot = await view('pilot_status', {});
const admission = await view('admission_status', {});
const storage = await view('storage_balance_of', { account_id: holder });
const holderBalance = await view('ft_balance_of', { account_id: holder });
const borrowerBalance = await view('ft_balance_of', { account_id: 'carol.floorline-g3-20261111-6702ea.testnet' });
const nftHolderBalance = await view('ft_balance_of', { account_id: 'dave.floorline-g3-20261111-6702ea.testnet' });
const lenderBalance = await view('ft_balance_of', { account_id: 'lender.floorline-g3-20261111-6702ea.testnet' });
assert.equal(ledger.L, '10000000000000000000000');
assert.equal(ledger.T, '10000000000000000000000');
assert.equal(ledger.locked, '0'); assert.equal(ledger.inflight, '0'); assert.equal(ledger.refund_storage, '0');
assert.equal(pilot.gross, '10000000000000000000000'); assert.equal(pilot.stopped, false);
assert.equal(holderBalance, ledger.T);
assert.equal(borrowerBalance, '0'); assert.equal(nftHolderBalance, '0'); assert.equal(lenderBalance, '0');
assert.equal(storage.total, '20000000000000000000000'); assert.equal(admission.occupied, 4);
const localBuckets = ['L','unused_lender','storage_total','operational','borrower_claims','lender_claims','redemption_claims','cancellation_claims','storage_refund_claims'];
assert.equal(localBuckets.reduce((n, key) => n + BigInt(ledger[key]), 0n), BigInt(ledger.local_required));
assert(BigInt(ledger.account_balance) >= BigInt(ledger.local_required));

execution.rows.push({
  id: 'issue', role: 'holder', signer: holder, receiver: contract, hash,
  status: 'FINAL_VERIFIED', method: 'issue', args: { min_tokens: '10000000000000000000000' },
  deposit: '10000000000000000000000', gas: '110000000000000', fee,
  value: '10000000000000000000000', browser: true, outcome,
});
execution.values.issue = '10000000000000000000000';
execution.status = 'ISSUE_FINAL_VERIFIED_REMAINING_GRAPH_PAUSED_FOR_AMENDMENT';
execution.browser_acceptance = 'REGISTRATION_AND_ISSUE_SIGNED_IN_METEOR_AND_FULL_RECEIPTS_VERIFIED';
execution.current_snapshot = { at, ledger, pilot, admission, storage, balances: { holder: holderBalance, borrower: borrowerBalance, nft_holder: nftHolderBalance, lender: lenderBalance } };
save('ACCEPTANCE_EXECUTION.json', execution);
console.log(JSON.stringify({ hash, fee, holder, L: ledger.L, T: ledger.T, gross: pilot.gross, storage, admission, status: execution.status }, null, 2));
