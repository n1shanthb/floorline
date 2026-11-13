import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const requireFromRuntime=createRequire('file:///E:/near-2/runtime/package.json');
const nearAPI=requireFromRuntime('near-api-js');
const {connect,keyStores,KeyPair,transactions}=nearAPI;
const ROOT=path.resolve(import.meta.dirname,'..');
const RPC='http://127.0.0.1:3032';
const N=10n**24n,GAS=300n*10n**12n;
const store=new keyStores.InMemoryKeyStore();
const validator=JSON.parse(fs.readFileSync(path.join(ROOT,'.sandbox/node/validator_key.json')));
await store.setKey('sandbox',validator.account_id,KeyPair.fromString(validator.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:RPC,keyStore:store});
const status=await near.connection.provider.status();
assert(status.chain_id.startsWith('test-chain'));
const root=await near.account(validator.account_id);
const tag=Date.now().toString(36);
const results=[];
const journal=[];
const localKeys=new Map();
let passed=0;
async function account(label,balance=50n*N){const id=`${label}${tag}.${root.accountId}`;const key=KeyPair.fromRandom('ed25519');localKeys.set(id,key);await store.setKey('sandbox',id,key);await root.createAccount(id,key.getPublicKey(),balance);return near.account(id)}
async function accountState(id){try{return await near.connection.provider.query({request_type:'view_account',account_id:id,finality:'optimistic'})}catch{return null}}
async function tx(signer,receiver,method,args={},deposit=0n,gas=GAS){
  const receiverId=receiver.accountId??receiver,before=await accountState(receiverId);
  const r=await signer.signAndSendTransaction({receiverId,actions:[transactions.functionCall(method,Buffer.from(JSON.stringify(args)),gas,deposit)],returnError:true});
  const after=await accountState(receiverId),outcomes=[r.transaction_outcome,...r.receipts_outcome];
  journal.push({signer:signer.accountId,receiver:receiverId,method,deposit:deposit.toString(),transaction_hash:r.transaction.hash,final_status:r.status,total_gas_burnt:outcomes.reduce((n,x)=>n+BigInt(x.outcome.gas_burnt),0n).toString(),receiver_storage_before:before?.storage_usage??null,receiver_storage_after:after?.storage_usage??null,receiver_storage_delta:before&&after?after.storage_usage-before.storage_usage:null,receipts:r.receipts_outcome.map(x=>({id:x.id,executor:x.outcome.executor_id,status:x.outcome.status,gas_burnt:x.outcome.gas_burnt}))});
  return r
}
async function view(receiver,method,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:receiver.accountId??receiver,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(r.result).toString())}
function value(r){return r.status.SuccessValue?JSON.parse(Buffer.from(r.status.SuccessValue,'base64').toString()):null}
function failures(r){return [r.transaction_outcome,...r.receipts_outcome].filter(x=>x.outcome.status.Failure)}
async function check(name,fn){try{const detail=await fn();passed++;results.push({name,status:'PASS',...detail});console.log(`PASS ${name}`)}catch(e){results.push({name,status:'FAIL',error:e.stack});throw e}}
async function expectFailure(p){const r=await p;assert(r.status.Failure||failures(r).length>0,JSON.stringify(r.status));return r}
async function deploy(label,artifact){const a=await account(label,20n*N);await a.deployContract(fs.readFileSync(artifact));await tx(a,a,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});return a}
async function register(floor,a,amount=N){const r=await tx(a,floor,'storage_deposit',{account_id:null,registration_only:false},amount);assert.equal(failures(r).length,0)}

const normalArtifact=path.join(ROOT,'artifacts/floorline-v2.wasm');
const faultArtifact=path.join(ROOT,'artifacts/floorline-v2-fault-short.wasm');
const normal=await deploy('normal',normalArtifact);
const alice=await account('alice'),bob=await account('bob'),carol=await account('carol'),dave=await account('dave'),lender=await account('lender');
for(const a of [alice,bob,carol,dave,lender])await register(normal,a);

await check('economic issuance redemption payout and duplicate rejection',async()=>{
  await tx(alice,normal,'issue',{min_tokens:'0'},10n*N);
  await tx(alice,normal,'ft_transfer',{receiver_id:bob.accountId,amount:N.toString(),memo:null},1n);
  const claim=value(await tx(bob,normal,'redeem',{amount:(N/2n).toString(),min_out:'1'}));
  const paid=await tx(bob,normal,'withdraw_claim',{claim_id:claim});
  assert.equal(failures(paid).length,0);assert.equal((await view(normal,'get_claim',{claim_id:claim})).state,3);
  await expectFailure(tx(bob,normal,'withdraw_claim',{claim_id:claim}));
  return {claim,receipt_count:paid.receipts_outcome.length};
});

await check('overlapping payouts preserve solvency',async()=>{
  await tx(alice,normal,'ft_transfer',{receiver_id:bob.accountId,amount:(2n*N).toString(),memo:null},1n);
  const c1=value(await tx(bob,normal,'redeem',{amount:(N/4n).toString(),min_out:'1'}));
  const c2=value(await tx(bob,normal,'redeem',{amount:(N/4n).toString(),min_out:'1'}));
  await Promise.all([tx(bob,normal,'withdraw_claim',{claim_id:c1}),tx(bob,normal,'withdraw_claim',{claim_id:c2})]);
  const a=await view(normal,'accounting');assert(BigInt(a.account_balance)>=BigInt(a.local_required));
  return {claims:[c1,c2],accounting:a};
});

await check('loan NFT transfer repayment and terminal exclusivity',async()=>{
  await tx(alice,normal,'ft_transfer',{receiver_id:carol.accountId,amount:N.toString(),memo:null},1n);
  const loan=value(await tx(lender,normal,'fund_offer',{repayment:(11n*N/100n).toString(),collateral:(N/2n).toString(),duration_ns:'60000000000'},N/10n));
  const principal=value(await tx(carol,normal,'accept_offer',{loan_id:loan}));
  await tx(carol,normal,'nft_transfer',{receiver_id:dave.accountId,token_id:loan,approval_id:null,memo:null},1n);
  await expectFailure(tx(carol,normal,'repay',{loan_id:loan},11n*N/100n));
  const repayment=value(await tx(dave,normal,'repay',{loan_id:loan},11n*N/100n));
  await expectFailure(tx(dave,normal,'repay',{loan_id:loan},11n*N/100n));
  await expectFailure(tx(bob,normal,'default_loan',{loan_id:loan}));
  return {loan,principal_claim:principal,repayment_claim:repayment};
});

await check('storage refund success releases temporary record',async()=>{
  const before=await view(normal,'accounting');
  const balance=await view(normal,'storage_balance_of',{account_id:bob.accountId});
  const amount=BigInt(balance.available)/2n;
  const r=await tx(bob,normal,'storage_withdraw',{amount:amount.toString()},1n);
  assert.equal(failures(r).length,0);
  const after=await view(normal,'accounting');assert.equal(after.refund_storage,'0');
  return {before_refund_storage:before.refund_storage,after_refund_storage:after.refund_storage};
});

await check('known failed native transfer restores only its funded claim',async()=>{
  const fixture=await account('disappear',10n*N);
  await fixture.deployContract(fs.readFileSync('E:/near-2/target/wasm32-unknown-unknown/release/floorline_receiver_fixture.wasm'));
  await register(normal,fixture);
  await tx(alice,normal,'ft_transfer',{receiver_id:fixture.accountId,amount:(N/2n).toString(),memo:null},1n);
  const claim=value(await tx(fixture,fixture,'act',{target:normal.accountId,method:'redeem',args:{amount:(N/4n).toString(),min_out:'1'},deposit:'0'}));
  assert.notEqual(claim,null);
  const disappear=await tx(fixture,fixture,'withdraw_and_disappear',{target:normal.accountId,claim_id:claim,beneficiary:root.accountId});
  assert.equal((await view(normal,'get_claim',{claim_id:claim})).state,2,'transfer failure callback must classify KnownFailed');
  const key=localKeys.get(fixture.accountId);
  await root.createAccount(fixture.accountId,key.getPublicKey(),5n*N);
  const restored=await near.account(fixture.accountId);
  await tx(restored,normal,'retry_failed_claim',{claim_id:claim});
  assert.equal((await view(normal,'get_claim',{claim_id:claim})).state,0);
  const retry=await tx(restored,normal,'withdraw_claim',{claim_id:claim});
  assert.equal(failures(retry).length,0);assert.equal((await view(normal,'get_claim',{claim_id:claim})).state,3);
  return {claim,failed_transfer_receipts:failures(disappear).map(x=>x.id),retry_receipts:retry.receipts_outcome.length};
});

const fault=await deploy('fault',faultArtifact);
const fa=await account('faultalice'),fb=await account('faultbob');
for(const a of [fa,fb])await register(fault,a);
await tx(fa,fault,'issue',{min_tokens:'0'},2n*N);
await tx(fa,fault,'ft_transfer',{receiver_id:fb.accountId,amount:N.toString(),memo:null},1n);

await check('lost callback remains quarantined and cannot double withdraw',async()=>{
  const claim=value(await tx(fa,fault,'redeem',{amount:(N/2n).toString(),min_out:'1'}));
  const first=await tx(fa,fault,'withdraw_claim',{claim_id:claim});
  assert(failures(first).length>0,'fault callback must fail');
  assert.equal((await view(fault,'get_claim',{claim_id:claim})).state,1);
  await expectFailure(tx(fa,fault,'withdraw_claim',{claim_id:claim}));
  await expectFailure(tx(fb,fault,'finalize_unknown_claim_as_paid',{claim_id:claim}));
  await expectFailure(tx(fa,fault,'finalize_unknown_claim_as_paid',{claim_id:claim}));
  await new Promise(r=>setTimeout(r,5500));
  await tx(fa,fault,'finalize_unknown_claim_as_paid',{claim_id:claim});
  const final=await view(fault,'get_claim',{claim_id:claim});assert.equal(final.state,3);
  await expectFailure(tx(fa,fault,'withdraw_claim',{claim_id:claim}));
  return {claim,final,failed_receipts:failures(first).map(x=>x.id)};
});

await check('unrelated user can create payout while another claim is unknown',async()=>{
  const claim=value(await tx(fb,fault,'redeem',{amount:(N/4n).toString(),min_out:'1'}));
  const r=await tx(fb,fault,'withdraw_claim',{claim_id:claim});
  assert(failures(r).length>0);assert.equal((await view(fault,'get_claim',{claim_id:claim})).state,1);
  const a=await view(fault,'accounting');assert(BigInt(a.account_balance)>=BigInt(a.local_required));
  return {claim,accounting:a};
});

await check('storage refund saturation is bounded and owner cleanup restores capacity',async()=>{
  const successful=[];let rejected=false;
  for(let i=0;i<100;i++){
    const before=BigInt((await view(fault,'accounting')).refund_storage);
    const r=await tx(fa,fault,'storage_deposit',{account_id:null,registration_only:true},N/1000n);
    const after=BigInt((await view(fault,'accounting')).refund_storage);
    if(after===before){rejected=true;break}
    successful.push(i);
  }
  assert(rejected,'finite operational refund storage must reject before unbounded growth');
  const ids=[];
  for(let id=0;id<300;id++){const r=await view(fault,'get_refund',{refund_id:id.toString()});if(r&&r.receiver===fa.accountId)ids.push(id.toString())}
  assert(ids.length>0&&ids.length===successful.length,`refund record mismatch ${ids.length}/${successful.length}`);
  await expectFailure(tx(fb,fault,'finalize_unknown_refund_as_paid',{refund_id:ids[0]}));
  await new Promise(r=>setTimeout(r,5500));
  for(const id of ids)await tx(fa,fault,'finalize_unknown_refund_as_paid',{refund_id:id});
  const after=await view(fault,'accounting');assert.equal(after.refund_storage,'0');
  const fresh=await tx(fa,fault,'storage_deposit',{account_id:null,registration_only:true},N/1000n);
  assert(!fresh.status.Failure,'cleanup must restore one refund slot');
  return {bounded_records:ids.length,rejected_at:successful.length,refund_storage_after_cleanup:after.refund_storage};
});

const normalBytes=fs.readFileSync(normalArtifact),faultBytes=fs.readFileSync(faultArtifact);
const report={network:'LOCAL_SANDBOX_ONLY',sandbox_version:'2.14.0',chain_id:status.chain_id,passed,failed:results.filter(x=>x.status==='FAIL').length,results,journal,artifacts:{normal:{bytes:normalBytes.length,sha256:createHash('sha256').update(normalBytes).digest('hex')},fault_short_quarantine:{bytes:faultBytes.length,sha256:createHash('sha256').update(faultBytes).digest('hex')}},accounts:Object.fromEntries([normal,alice,bob,carol,dave,lender,fault,fa,fb].map(a=>[a.accountId,'disposable sandbox identity; key omitted']))};
fs.writeFileSync(path.join(ROOT,'evidence/sandbox-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed,failed:report.failed,normal_sha256:report.artifacts.normal.sha256,fault_sha256:report.artifacts.fault_short_quarantine.sha256}));

