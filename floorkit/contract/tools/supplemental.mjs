// Authorized disposable-local-key tests for closure during FT resolution and
// the global unregister consequence of eight lost operational callbacks.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const ROOT=path.resolve(import.meta.dirname,'..'),require=createRequire(path.resolve(ROOT,'../../runtime/package.json'));
const {connect,keyStores,KeyPair,transactions}=require('near-api-js');const N=10n**24n,G=300n*10n**12n;
const vk=JSON.parse(fs.readFileSync(path.join(ROOT,'sandbox-home/node/validator_key.json'))),store=new keyStores.InMemoryKeyStore();
await store.setKey('sandbox',vk.account_id,KeyPair.fromString(vk.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:store});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(vk.account_id),tag=Date.now().toString(36),evidence=[];
const run=JSON.parse(fs.readFileSync(path.join(ROOT,'evidence/SANDBOX_RESULTS.json')));assert.equal(run.error,null);
const wasm=fs.readFileSync(path.join(ROOT,'artifacts/floorkit.wasm'));
async function account(label){const id=`${label}${tag}.${root.accountId}`,k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,k);root.accessKeyByPublicKeyCache={};await root.createAccount(id,k.getPublicKey(),100n*N);return near.account(id);}
async function view(account_id,method_name,args={}){const x=await near.connection.provider.query({request_type:'call_function',account_id,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(x.result).toString());}
async function call(actor,to,method,args={},deposit=0n,fail=false){actor.accessKeyByPublicKeyCache={};const raw=await actor.signAndSendTransaction({receiverId:to,actions:[transactions.functionCall(method,Buffer.from(JSON.stringify(args)),G,deposit)],returnError:true});evidence.push({actor:actor.accountId,to,method,args,deposit:deposit.toString(),expected_failure:fail,raw});assert.equal(Boolean(raw.status.Failure),fail,JSON.stringify(raw.status));return raw;}
function save(status,error=null){fs.writeFileSync(path.join(ROOT,'evidence/SUPPLEMENTAL.json'),JSON.stringify({status,network:'LOCAL_SANDBOX_ONLY',error,evidence},null,2)+'\n');}
try {
 const f=await account('pendingclose'),owner=await account('pendingowner'),receiver=await account('pendingreceiver');
 await f.deployContract(wasm);await receiver.deployContract(fs.readFileSync(path.join(ROOT,'artifacts/receiver.wasm')));
 await call(owner,f.accountId,'new',{metadata:{spec:'ft-1.0.0',name:'Closure during pending FT',symbol:'CLOSE',decimals:24,icon:null,reference:null,reference_hash:null},initial_price:N.toString(),markup_bps:500,redemption_tax_bps:2000,creator_fee_bps:100,creator_id:owner.accountId,bootstrap_recipient:owner.accountId,seed_reserve:(10n*N).toString(),recipient_storage:N.toString(),operational_reserve:(5n*N).toString()},16n*N);
 await call(owner,f.accountId,'storage_deposit',{account_id:receiver.accountId,registration_only:false},N);
 await call(owner,f.accountId,'ft_transfer_call',{receiver_id:receiver.accountId,amount:(10n*N).toString(),memo:null,msg:JSON.stringify({kind:'redeem'})},1n);
 let a=await view(f.accountId,'accounting');assert(a.closed);assert.equal(a.R,'0');assert.equal(a.T,'0');assert.equal(a.C,(10n*N).toString());assert.equal(await view(f.accountId,'get_pending_ft_call',{call_id:'0'}),null);
 await call(owner,receiver.accountId,'act',{target:f.accountId,method:'withdraw_claim',args:{claim_id:'1'},deposit:'1'});
 assert.equal((await view(f.accountId,'get_claim',{claim_id:'1'})).state,'paid');
 await call(owner,f.accountId,'mint',{min_tokens:'0',deadline_ns:'18446744073709551615'},N,true);
 evidence.push({name:'closure_during_actual_ft_callback',account_id:f.accountId,accounting:await view(f.accountId,'accounting'),result:'PASS'});
 const pool=run.evidence.find(e=>e.name==='atomic_init_poolfault').raw.transaction.receiver_id;
 const empty=await account('poolvictim'),min=(await view(pool,'storage_balance_bounds')).min;
 await call(root,pool,'storage_deposit',{account_id:empty.accountId,registration_only:true},BigInt(min));
 const before=await view(pool,'accounting');assert.equal(before.refund_pool_used,8);
 await call(empty,pool,'storage_unregister',{force:false},1n,true);
 const after=await view(pool,'accounting'),balance=await view(pool,'storage_balance_of',{account_id:empty.accountId});assert(balance);
 for(const k of ['R','T','C','F','H','K','O','I'])assert.equal(after[k],before[k]);
 evidence.push({name:'pool_saturation_blocks_unrelated_empty_user_unregister',account_id:pool,before,after,user_storage:balance,
   result:'REPRODUCED GLOBAL AVAILABILITY LIMIT: no safe recovery for unknown callbacks in approved model',
   fault_boundary:'Eight callbacks lost using separate 0.001-Tgas local fault artifact; not evidence an attacker can force this with normal 30-Tgas artifact'});
 save('PASS: both scenarios executed; availability limitation reproduced');console.log(JSON.stringify({status:'PASS',scenarios:2,records:evidence.length}));
}catch(e){save('FAIL',e.stack);console.error(e.stack);process.exitCode=1;}
