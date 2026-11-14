import assert from 'node:assert/strict';
import fs from 'node:fs';
import { out, save } from './execution-rpc.mjs';

const journal = JSON.parse(fs.readFileSync(`${out}/ACCEPTANCE_EXECUTION.json`, 'utf8'));
assert.equal(journal.status, 'STOPPED_NO_RETRY');
assert.match(journal.error, /30000000000000/);
assert.match(journal.error, /110000000000000/);
assert.equal(journal.rows.length, 11);
assert(journal.rows.every(row => row.status === 'FINAL_VERIFIED'));
assert.equal(journal.rows.at(-1).id, 'issue');
assert(!journal.rows.some(row => ['SIGNED_NOT_BROADCAST', 'BROADCAST_ATTEMPTED'].includes(row.status)));
save('COLLATERAL_GAS_MISMATCH_STOP.json', journal);
journal.status = 'ISSUE_FINAL_VERIFIED_RESUMING_WITH_AUTHORIZED_COLLATERAL_GAS_AMENDMENT';
journal.gas_amendment = 'COLLATERAL_GAS_AMENDMENT.json';
delete journal.error;
save('ACCEPTANCE_EXECUTION.json', journal);
console.log(JSON.stringify({status: journal.status, gas_amendment: journal.gas_amendment}));
