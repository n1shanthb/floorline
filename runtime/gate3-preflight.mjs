// Read-only public-testnet checks. No signing, key generation or funding.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const ROOT=path.resolve(import.meta.dirname,'..'),dir=path.join(ROOT,'testnet/evidence');fs.mkdirSync(dir,{recursive:true});
const wasm=fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline.wasm'));
const hash=createHash('sha256').update(wasm).digest('hex');
if(hash!=='529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6')throw Error('STOP: unauthorized artifact hash');
const endpoints=['https://rpc.testnet.near.org','https://test.rpc.fastnear.com'];
async function rpc(url,method,params){try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});return await r.json();}catch(e){return {transport_error:e.message};}}
const checks=await Promise.all(endpoints.map(async url=>({url,status:await rpc(url,'status',[])})));
const endpoint=checks.find(x=>x.status.result?.chain_id==='testnet')?.url;
if(!endpoint){fs.writeFileSync(path.join(dir,'preflight.json'),JSON.stringify({checked_at:new Date().toISOString(),artifact_sha256:hash,artifact_bytes:wasm.length,checks,blocked:'No verified testnet RPC'},null,2));throw Error('No verified testnet RPC');}
const query=(p)=>rpc(endpoint,'query',{...p,finality:'final'});
const calls={protocol:()=>rpc(endpoint,'EXPERIMENTAL_protocol_config',{finality:'final'}),gas_price:()=>rpc(endpoint,'gas_price',[null]),factory_account:()=>query({request_type:'view_account',account_id:'sputnikv2.testnet'}),factory_code:()=>query({request_type:'view_code',account_id:'sputnikv2.testnet'})};
const results=Object.fromEntries(await Promise.all(Object.entries(calls).map(async([k,f])=>[k,await f()])));
if(results.factory_code.result?.code_base64){const code=Buffer.from(results.factory_code.result.code_base64,'base64');fs.writeFileSync(path.join(dir,'sputnik-factory-live.wasm'),code);results.factory_code={block_hash:results.factory_code.result.block_hash,block_height:results.factory_code.result.block_height,hash:results.factory_code.result.hash,sha256:createHash('sha256').update(code).digest('hex'),bytes:code.length};}
for(const method_name of ['get_default_code_hash','get_owner']){
 const r=await query({request_type:'call_function',account_id:'sputnikv2.testnet',method_name,args_base64:Buffer.from('{}').toString('base64')});
 if(r.result?.result){try{r.decoded=JSON.parse(Buffer.from(r.result.result).toString());}catch{r.decoded=Buffer.from(r.result.result).toString();}}results[method_name]=r;
}
const config=results.protocol.result?.runtime_config;
const cost=config?.storage_amount_per_byte;
const minimum=cost?(BigInt(wasm.length+182+4096)*BigInt(cost)+10n**23n).toString():null;
const out={checked_at:new Date().toISOString(),network:'testnet',artifact_sha256:hash,artifact_bytes:wasm.length,checks,endpoint,results,estimate:{storage_byte_cost:cost,initial_storage_and_operational_floor_yocto:minimum,contract_allocation_cap_yocto:(8n*10n**24n).toString(),note:'Exact initial state and public-account usage must be verified after authorized deployment; this is a pre-deployment bound.'},transactions_submitted:[]};
fs.writeFileSync(path.join(dir,'preflight.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify({artifact:hash,bytes:wasm.length,endpoint,chain:checks.find(x=>x.url===endpoint).status.result.chain_id,protocol:results.protocol.result?.protocol_version,storage_byte_cost:cost,max_prepaid_gas:config?.wasm_config?.limit_config?.max_total_prepaid_gas,contract_floor:minimum,factory:results.factory_account.result??results.factory_account.error,default_code_hash:results.get_default_code_hash.decoded??results.get_default_code_hash.error},null,2));
