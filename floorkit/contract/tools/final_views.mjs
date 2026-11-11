// Read-only final local-chain reconciliation. No keys or signing.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const ROOT=path.resolve(import.meta.dirname,'..');const require=createRequire(path.resolve(ROOT,'../../runtime/package.json'));
const {providers}=require('near-api-js');const p=new providers.JsonRpcProvider({url:'http://127.0.0.1:3032'});
assert((await p.status()).chain_id.startsWith('test-chain'));
const run=JSON.parse(fs.readFileSync(path.join(ROOT,'evidence/SANDBOX_RESULTS.json')));
const supplemental=JSON.parse(fs.readFileSync(path.join(ROOT,'evidence/SUPPLEMENTAL.json')));
const audit=JSON.parse(fs.readFileSync(path.join(ROOT,'evidence/ARTIFACT_AUDIT.json')));
assert.equal(run.error,null);
async function view(account_id,method_name,args={}){const v=await p.query({request_type:'call_function',account_id,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(v.result).toString());}
const actors=[...new Set([...run.accounts,...supplemental.evidence.map(e=>e.actor).filter(Boolean)])];
const initializations=[...run.evidence.filter(e=>e.name.startsWith('atomic_init_')),
    ...supplemental.evidence.filter(e=>e.method==='new').map(e=>({name:'atomic_init_supplemental_closure',raw:e.raw,config:e.args}))];
const result=[];
for(const entry of initializations){
    const account_id=entry.raw.transaction.receiver_id;
    const config=await view(account_id,'get_config'),a=await view(account_id,'accounting');
    const state=await p.query({request_type:'view_account',account_id,finality:'optimistic'});
    const keys=await p.query({request_type:'view_access_key_list',account_id,finality:'optimistic'});
    const balances=await Promise.all(actors.map(async actor=>[actor,await view(account_id,'ft_balance_of',{account_id:actor})]));
    assert.equal(balances.reduce((sum,[,n])=>sum+BigInt(n),0n),BigInt(a.T),'supply partition');
    assert.equal(BigInt(state.amount)+BigInt(state.locked),BigInt(a.A));
    const isFault=/atomic_init_(fault|poolfault)/.test(entry.name);
    assert.equal(state.code_hash,audit.artifacts[isFault?'floorkit-fault.wasm':'floorkit.wasm'].near_code_hash);
    assert.equal(config.initial_price,entry.config.initial_price);assert.equal(config.markup_bps,entry.config.markup_bps);
    assert.equal(config.redemption_tax_bps,entry.config.redemption_tax_bps);assert.equal(config.creator_fee_bps,entry.config.creator_fee_bps);assert.equal(config.creator_id,entry.config.creator_id);
    assert(BigInt(a.A)>=BigInt(a.P));assert(BigInt(a.storage_stake)<=BigInt(a.K)+BigInt(a.O));
    result.push({account_id,accounting:a,state,config,public_access_keys:keys,token_balances:Object.fromEntries(balances),supply_partition:'PASS',parameters_unchanged:'PASS',actual_immutability:'NO: disposable full-access key retained'});
}
fs.writeFileSync(path.join(ROOT,'evidence/FINAL_CHAIN_RECONCILIATION.json'),JSON.stringify({status:'PASS',network:'LOCAL_SANDBOX_ONLY',instances:result},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',instances:result.length,private_key_access:false,signing:false}));
