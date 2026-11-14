import assert from 'node:assert/strict';
import fs from 'node:fs';
import { out, save } from './execution-rpc.mjs';

const file = `${out}/ACCEPTANCE_EXECUTION.json`;
const journal = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(journal.status, 'STOPPED_NO_RETRY');
assert.equal(journal.error, 'RPC HTTP 429 https://test.rpc.fastnear.com block');
assert.equal(journal.rows.length, 11);
assert(journal.rows.every(row => row.status === 'FINAL_VERIFIED'));
assert.equal(journal.rows.at(-1).id, 'issue');
assert.equal(journal.rows.at(-1).hash, '63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm');
assert(!journal.rows.some(row => ['SIGNED_NOT_BROADCAST', 'BROADCAST_ATTEMPTED'].includes(row.status)));
save('RPC_429_POST_ISSUE_STOP.json', journal);
journal.status = 'ISSUE_FINAL_VERIFIED_RESUMING_AFTER_READONLY_RPC_429';
journal.recovered_stop = {
  evidence: 'RPC_429_POST_ISSUE_STOP.json',
  scope: 'read-only block query before next transaction signing',
  unknown_transactions: 0,
  retried_transactions: 0,
};
delete journal.error;
save('ACCEPTANCE_EXECUTION.json', journal);
console.log(JSON.stringify(journal.recovered_stop));
