import assert from 'node:assert/strict';
import fs from 'node:fs';
import { out, save } from './execution-rpc.mjs';

const journal = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, 'utf8'));
assert.equal(journal.status, 'STOPPED_NO_RETRY');
assert.equal(journal.error, 'RPC HTTP 429 https://test.rpc.fastnear.com status');
assert.equal(journal.rows.length, 11);
assert(journal.rows.every(row => row.status === 'FINAL_VERIFIED'));
assert.equal(journal.rows.at(-1).hash, '63AaM37eN455GB8JinN6oUYDjzuZaMcEfcGG3ZwxcdVm');
assert(!journal.rows.some(row => ['SIGNED_NOT_BROADCAST', 'BROADCAST_ATTEMPTED'].includes(row.status)));
save('RPC_429_POST_ISSUE_STOP_2.json', journal);
journal.status = 'ISSUE_FINAL_VERIFIED_RESUMING_WITH_DRPC_AND_OFFICIAL_RPC';
journal.rpc_pair = ['https://near-testnet.drpc.org', 'https://rpc.testnet.near.org'];
journal.recovered_stop_2 = { evidence: 'RPC_429_POST_ISSUE_STOP_2.json', scope: 'read-only status query before next signing', unknown_transactions: 0, retried_transactions: 0 };
delete journal.error;
save('ACCEPTANCE_EXECUTION.json', journal);
console.log(JSON.stringify(journal.recovered_stop_2));
