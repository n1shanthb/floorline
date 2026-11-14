import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {connect,keyStores,KeyPair,transactions}=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const base=import.meta.dirname,out=process.env.RELEASE_DIR??base+'/runtime/evidence/finalization-20261113',N=10n**24n;
const v=JSON.parse(fs.readFileSync(base+'/.sandbox/node/validator_key.json')),store=new keyStores.InMemoryKeyStore();await store.setKey('sandbox',v.account_id,KeyPair.fromString(v.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:store});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(v.account_id),keys=new Map(),rows=[];
async function create(label){const id=label+Date.now()+'.'+root.accountId,k=KeyPair.fromRandom('ed25519');keys.set(id,k);await store.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),10n*N);return near.account(id)}
async function view(c,m,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:c.accountId,method_name:m,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'final'});return JSON.parse(Buffer.from(r.result))}
async function call(a,c,m,args={},d=0n){const sent=await a.signAndSendTransaction({receiverId:c.accountId,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),300n*10n**12n,d)],returnError:true});const r=await near.connection.provider.sendJsonRpc('tx',{tx_hash:sent.transaction.hash,sender_account_id:a.accountId,wait_until:'FINAL'});rows.push({method:m,result:r});return r}
const c=await create('refundfloor'),f=await create('refundreceiver');await c.deployContract(fs.readFileSync(out+'/new-normal.wasm'));await f.deployContract(fs.readFileSync(out+'/refund-fixture.wasm'));
await call(root,c,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1',...(process.env.SANDBOX_PILOT_LIMITS?{pilot_limits:JSON.parse(process.env.SANDBOX_PILOT_LIMITS)}:{})});
await call(root,c,'storage_deposit',{account_id:f.accountId,registration_only:false},N/100n);
const initial=await view(c,'admission_status');assert.equal(initial.occupied,1);
const fail=await call(f,f,'unregister_and_disappear',{target:c.accountId,beneficiary:root.accountId});assert(fail.receipts_outcome.some(x=>x.outcome.status.Failure));
assert.equal((await view(c,'user_state',{account_id:f.accountId})).refund_state,3);
await root.createAccount(f.accountId,keys.get(f.accountId).getPublicKey(),N);
const retry=await call(f,c,'retry_storage_refund',{refund_id:'0'});assert(!retry.receipts_outcome.some(x=>x.outcome.status.Failure));
assert.equal(await view(c,'user_state',{account_id:f.accountId}),null);assert.equal((await view(c,'admission_status')).occupied,0);
const again=await call(f,c,'retry_storage_refund',{refund_id:'0'});assert(again.status.Failure);
const a=await view(c,'accounting');assert(BigInt(a.account_balance)>=BigInt(a.local_required));assert(BigInt(a.storage_total)+BigInt(a.operational)>=BigInt(a.storage_stake));
fs.writeFileSync(out+'/refund-recovery.json',JSON.stringify({network:'LOCAL_SANDBOX_ONLY',passed:true,rows,final:a},null,2));console.log('PASS actual failed unregister refund, same-identity recovery, slot release and duplicate retry rejection');
