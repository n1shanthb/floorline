import assert from 'node:assert/strict';
import fs from 'node:fs';
import { out, save } from './execution-rpc.mjs';

const journal = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, 'utf8'));
assert.equal(journal.status, 'STOPPED_NO_RETRY');
assert.equal(journal.error, 'RPC HTTP 429 https://rpc.testnet.near.org query');
assert.equal(journal.rows.length, 11);
assert(journal.rows.every(row => row.status === 'FINAL_VERIFIED'));
assert.equal(journal.rows.at(-1).id, 'issue');
assert.equal(journal.rows.at(-1).hash, '63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm');
assert(!journal.rows.some(row => ['SIGNED_NOT_BROADCAST', 'BROADCAST_ATTEMPTED'].includes(row.status)));
save('RPC_429_COLLATERAL_QUERY_STOP.json', journal);
journal.status = 'ISSUE_FINAL_VERIFIED_RESUMING_COLLATERAL_QUERY_RECONCILIATION';
journal.recovered_stop_4 = {
  evidence: 'RPC_429_COLLATERAL_QUERY_STOP.json',
  scope: 'read-only query while reconciling an already finalized browser hash',
  browser_hash: '8m2bHVobQsSpJjRzmuyQaQHiq7x3i1iCsqSJ2cYZxAiK',
  unknown_transactions: 0,
  retried_transactions: 0,
};
delete journal.error;
save('ACCEPTANCE_EXECUTION.json', journal);
console.log(JSON.stringify(journal.recovered_stop_4));
