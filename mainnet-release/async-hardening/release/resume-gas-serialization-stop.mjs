import assert from 'node:assert/strict';
import fs from 'node:fs';
import { out, save } from './execution-rpc.mjs';

const journal = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, 'utf8'));
assert.equal(journal.status, 'STOPPED_NO_RETRY');
assert.match(journal.error, /30000000000000/);
assert.match(journal.error, /'30000000000000'/);
assert.equal(journal.rows.length, 11);
assert(journal.rows.every(row => row.status === 'FINAL_VERIFIED'));
assert(!journal.rows.some(row => ['SIGNED_NOT_BROADCAST', 'BROADCAST_ATTEMPTED'].includes(row.status)));
save('COLLATERAL_GAS_SERIALIZATION_STOP.json', journal);
journal.status = 'ISSUE_FINAL_VERIFIED_RESUMING_AFTER_GAS_SERIALIZATION_FIX';
journal.gas_serialization_fix = 'numeric JSON-RPC gas compared with exact safe-integer amendment value';
delete journal.error;
save('ACCEPTANCE_EXECUTION.json', journal);
console.log(JSON.stringify({status: journal.status}));
