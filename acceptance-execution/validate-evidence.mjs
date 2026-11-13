import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
let count=0;
function check(value){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){assert(!['private_key','secret_key','seed_phrase','mnemonic'].includes(key),'Secret field in new evidence');check(child);}}
function file(p){check(JSON.parse(fs.readFileSync(p,'utf8')));count++;}
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else if(e.name.endsWith('.json'))file(p);}}
visit('acceptance-execution');file('TESTNET_ACCEPTANCE_TRANSACTIONS.json');file('TESTNET_ACCEPTANCE_BUDGET.json');
const j=JSON.parse(fs.readFileSync('TESTNET_ACCEPTANCE_TRANSACTIONS.json'));
assert.equal(j.transactions.length,9);assert.equal(new Set(j.transactions.map(t=>t.hash)).size,9);assert.equal(j.transactions.filter(t=>t.status==='PASS').length,8);assert.equal(j.transactions.at(-1).status,'UNKNOWN_BROADCAST_NOT_LOCATED');
assert.equal(j.financial_execution_stopped,true);assert.equal(j.final.claims['16'].state,0);assert.equal(j.final.nfts['15'].owner_id,j.preflight.roles.carol.account_id);
for(const c of Object.values(j.cases))assert(['PASS','FAIL','BLOCKED','SKIPPED'].includes(c.status));
console.log(`PASS: ${count} valid JSON documents; no secret fields; nine unique attempts, eight final successes, one quarantined unknown`);
