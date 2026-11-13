import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const b=import.meta.dirname,o=path.join(b,'runtime/evidence/finalization-20261113');
const sha=x=>createHash('sha256').update(x).digest('hex');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function codeHash(bytes){let n=BigInt('0x'+sha(bytes)),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n}return s}
const normal=fs.readFileSync(o+'/new-normal.wasm'),fault=fs.readFileSync(o+'/new-fault.wasm');assert(!normal.equals(fault));assert(normal.equals(fs.readFileSync(b+'/target/wasm32-unknown-unknown/release/floorline_kill_test.wasm')));
const old=JSON.parse(fs.readFileSync(o+'/old-summary.json')),fixed=JSON.parse(fs.readFileSync(o+'/new-summary.json')),success=JSON.parse(fs.readFileSync(o+'/normal-summary.json'));
assert.equal(old.accepted,56);assert.equal(fixed.accepted,128);assert.equal(success.accepted,128);assert.equal(success.admission.occupied,0);
const regression=JSON.parse(fs.readFileSync(o+'/runtime.json'));assert.equal(regression.tests,32);assert.equal(regression.failed.length,0);
const metrics={},transactions=new Map();
function add(method,r){if(!r?.transaction?.hash)return;transactions.set(r.transaction.hash,r);const outcomes=[r.transaction_outcome,...r.receipts_outcome];const gas=outcomes.reduce((s,x)=>s+BigInt(x.outcome.gas_burnt),0n);const parent=r.receipts_outcome.find(x=>x.outcome.executor_id===r.transaction.receiver_id);const g=metrics[method]??={count:0,max_total_gas:'0',max_parent_gas:'0',max_other_receipt_gas:'0'};g.count++;if(gas>BigInt(g.max_total_gas))g.max_total_gas=gas.toString();if(parent&&BigInt(parent.outcome.gas_burnt)>BigInt(g.max_parent_gas))g.max_parent_gas=String(parent.outcome.gas_burnt);for(const x of r.receipts_outcome.filter(x=>x!==parent)){if(BigInt(x.outcome.gas_burnt)>BigInt(g.max_other_receipt_gas))g.max_other_receipt_gas=String(x.outcome.gas_burnt)}}
let checkpointCount=0,maxStorage=0,minMargin=null;
for(const name of fs.readdirSync(o).filter(n=>/^(old|new|normal)-tx-.*\.json$/.test(n))){const x=JSON.parse(fs.readFileSync(o+'/'+name));add(x.method,x.result);checkpointCount++;maxStorage=Math.max(maxStorage,x.ledger.storage_usage);const margin=BigInt(x.ledger.storage_total)+BigInt(x.ledger.operational)-BigInt(x.ledger.storage_stake);assert(margin>=0n);if(minMargin===null||margin<minMargin)minMargin=margin}
for(const name of ['gas-boundary.json','maximum-envelope-final.json','refund-recovery.json']){const j=JSON.parse(fs.readFileSync(o+'/'+name));for(const r of j.rows)add(r.method,r.result)}
for(const x of regression.evidence){if(x.gas_total){const g=metrics[x.method]??={count:0,max_total_gas:'0',max_parent_gas:'0',max_other_receipt_gas:'0'};if(BigInt(x.gas_total)>BigInt(g.max_total_gas))g.max_total_gas=x.gas_total}}
const files=['Cargo.toml','Cargo.lock','src/contract.rs','src/math.rs','src/engine.rs'];
const manifest={source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:b,encoding:'utf8'}).trim(),source_sha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(b,f)))])),toolchain:execFileSync('rustc',['--version'],{encoding:'utf8'}).trim(),near_sdk:'5.30.1',rustflags:'--cfg near',normal:{bytes:normal.length,sha256:sha(normal),code_hash:codeHash(normal)},fault:{bytes:fault.length,sha256:sha(fault),code_hash:codeHash(fault)},byte_for_byte_rebuild:true,old_failure:old,new_unknown_exits:fixed,normal_exits:success,regression_groups:regression.tests,finalized_capacity_checkpoints:checkpointCount,max_capacity_storage_bytes:maxStorage,min_capacity_storage_margin_yocto:minMargin.toString(),distinct_auxiliary_transactions:transactions.size,gas:metrics};
fs.writeFileSync(o+'/FINAL_MANIFEST.json',JSON.stringify(manifest,null,2));
for(const method of ['status','EXPERIMENTAL_protocol_config']){const r=await fetch('http://127.0.0.1:3032',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'readonly',method,params:method==='status'?[]:{finality:'final'}})});fs.writeFileSync(o+'/'+method+'.json',JSON.stringify(await r.json(),null,2))}
console.log(JSON.stringify({normal:manifest.normal,fault:manifest.fault,old_failure:old.accepted,unknown:fixed.accepted,normal_exits:success.accepted,regression:regression.tests,checkpoints:checkpointCount,gas:metrics},null,2));
