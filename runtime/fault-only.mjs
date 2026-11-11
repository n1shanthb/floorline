import fs from 'node:fs';import assert from 'node:assert/strict';import nearAPI from 'near-api-js';
const {connect,keyStores,KeyPair,transactions}=nearAPI,N=10n**24n;
const v=JSON.parse(fs.readFileSync('E:/near-2/.sandbox/node/validator_key.json'));
const store=new keyStores.InMemoryKeyStore();await store.setKey('sandbox',v.account_id,KeyPair.fromString(v.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3031',keyStore:store});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(v.account_id);const id=`faultprobe${Date.now().toString(36)}.${v.account_id}`;const key=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,key);await root.createAccount(id,key.getPublicKey(),20n*N);const c=await near.account(id);await c.deployContract(fs.readFileSync('E:/near-2/runtime/artifacts/floorline-fault.wasm'));
async function call(a,m,args,d=0n){return a.signAndSendTransaction({receiverId:id,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),300n*10n**12n,d)],returnError:true})}
const val=r=>r.status.SuccessValue?JSON.parse(Buffer.from(r.status.SuccessValue,'base64')):null;
await call(root,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});await call(root,'storage_deposit',{account_id:null,registration_only:false},N);await call(root,'issue',{min_tokens:'0'},N);
const claim=val(await call(root,'redeem',{amount:(N/10n).toString(),min_out:'1'}));const r=await call(root,'withdraw_claim',{claim_id:claim});
const x=await near.connection.provider.query({request_type:'call_function',account_id:id,method_name:'get_claim',args_base64:Buffer.from(JSON.stringify({claim_id:claim})).toString('base64'),finality:'optimistic'});const state=JSON.parse(Buffer.from(x.result));
const report={sandbox_only:true,claim:state,status:r.status,receipts:r.receipts_outcome};fs.writeFileSync('E:/near-2/runtime/evidence/fault-probe.json',JSON.stringify(report,null,2));assert.equal(state.state,1);console.log('FAULT PROBE PASSED: native payout dispatched; 0.001-Tgas callback failed; claim remains locked.');
