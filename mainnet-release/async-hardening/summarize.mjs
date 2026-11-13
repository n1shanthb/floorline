import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=import.meta.dirname;
const sha=x=>createHash('sha256').update(x).digest('hex');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function hash58(b){let n=BigInt('0x'+sha(b)),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n}return s}
const normal=fs.readFileSync(path.join(root,'runtime/artifacts/floorline.wasm'));
const fault=fs.readFileSync(path.join(root,'runtime/artifacts/floorline-fault.wasm'));
const rebuilt=fs.readFileSync(path.join(root,'target/wasm32-unknown-unknown/release/floorline_kill_test.wasm'));
if(!normal.equals(rebuilt))throw Error('Rebuild byte mismatch');
if(normal.equals(fault))throw Error('Fault binary equals normal');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'runtime/evidence/runtime.json')));
if(evidence.failed.length||evidence.tests!==32)throw Error('Final suite incomplete');
const groups={};
for(const row of evidence.evidence){if(!row.method||!row.gas_total)continue;const g=groups[row.method]??={count:0,max_gas:'0',min_gas:row.gas_total,min_storage_delta:row.storage_delta,max_storage_delta:row.storage_delta};g.count++;if(BigInt(row.gas_total)>BigInt(g.max_gas))g.max_gas=row.gas_total;if(BigInt(row.gas_total)<BigInt(g.min_gas))g.min_gas=row.gas_total;g.min_storage_delta=Math.min(g.min_storage_delta,row.storage_delta);g.max_storage_delta=Math.max(g.max_storage_delta,row.storage_delta)}
const files=['Cargo.toml','Cargo.lock','src/contract.rs','src/math.rs','src/engine.rs'];
const manifest={base_commit:'0c5b9a2',compiler:'rustc 1.99.1',near_sdk:'5.30.1',rustflags:'--cfg near',normal:{sha256:sha(normal),code_hash:hash58(normal),bytes:normal.length},fault:{sha256:sha(fault),code_hash:hash58(fault),bytes:fault.length},byte_for_byte_rebuild:true,source_sha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))])),tests:evidence.tests,failures:evidence.failed,gas_storage:groups};
fs.writeFileSync(path.join(root,'runtime/evidence/manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
