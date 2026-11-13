import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import nearAPI from 'near-api-js';
export async function run(h){
const {ROOT,N,GAS,near,root,store,keys,alice,bob,carol,dave,lender,dao,floor,account,view,state,tx,measure,test,result,failures,evidence}=h;
const fixture=fs.readFileSync(path.join(ROOT,'target/wasm32-unknown-unknown/release/floorline_receiver_fixture.wasm'));
const receiver=await account('receiver',20n*N);await receiver.deployContract(fixture);await measure('register_receiver',alice,floor,'storage_deposit',{account_id:receiver.accountId,registration_only:false},N);
const balance=a=>view(floor,'ft_balance_of',{account_id:a.accountId});
const act=(method,args,deposit='0')=>({target:floor.accountId,method,args,deposit});
async function offer(collateral=N/10n,duration='3600000000000'){
 let x=await measure('receiver_offer',lender,floor,'fund_offer',{repayment:(11n*N/1000n).toString(),collateral:collateral.toString(),duration_ns:duration},N/100n);let id=x.value;
 await measure('receiver_accept',carol,floor,'accept_offer',{loan_id:id});return id;
}
await test('One-yocto protection, escrow custody, canonical NFTs and expiry guards',async()=>{
 await measure('ft_zero_deposit',alice,floor,'ft_transfer',{receiver_id:bob.accountId,amount:'1',memo:null},0n,true);
 await measure('ft_wrong_deposit',alice,floor,'ft_transfer',{receiver_id:bob.accountId,amount:'1',memo:null},2n,true);
 await measure('ft_no_public_escrow_deposit',alice,floor,'ft_transfer',{receiver_id:floor.accountId,amount:'1',memo:null},1n,true);
 const id=await offer();assert.equal(await view(floor,'nft_token',{token_id:'0'+id}),null);
 await measure('nft_zero_deposit',carol,floor,'nft_transfer',{receiver_id:dave.accountId,token_id:id,approval_id:null,memo:null},0n,true);
 await measure('early_default',bob,floor,'default_loan',{loan_id:id},0n,true);
 const avail=BigInt(await balance(carol));await measure('cannot_redeem_locked',carol,floor,'redeem',{amount:(avail+1n).toString(),min_out:'0'},0n,true);
 await measure('escrow_cannot_spend',floor,floor,'ft_transfer',{receiver_id:dave.accountId,amount:'1',memo:null},1n,true);
 await measure('guard_loan_repay',carol,floor,'repay',{loan_id:id},11n*N/1000n);
 const low=await tx(alice,floor,'ft_transfer_call',{receiver_id:receiver.accountId,amount:'1',memo:null,msg:'accept'},1n,100n*10n**12n);assert(low.status.Failure);
});
for(const kind of ['accept','reject','malformed','panic','forward'])await test(`J: FT receiver ${kind}`,async()=>{
 const before=BigInt(await balance(receiver));const daveBefore=BigInt(await balance(dave));const x=await measure('ft_call_'+kind,alice,floor,'ft_transfer_call',{receiver_id:receiver.accountId,amount:(N/10n).toString(),memo:null,msg:JSON.stringify({kind,to:dave.accountId})},1n);
 if(kind==='accept')assert.equal(BigInt(await balance(receiver)),before+N/10n);
 else assert.equal(BigInt(await balance(receiver)),before);
 if(kind==='forward'){assert.equal(BigInt(await balance(dave)),daveBefore+N/10n);assert.equal(x.value,(N/10n).toString());}
 if(kind==='panic')assert(x.r.receipts_outcome.some(x=>x.outcome.status.Failure));
});
await test('J: FT refund never takes collateral locked inside receiver',async()=>{
 const before=BigInt(await balance(receiver));const total=before+N/10n;
 let x=await measure('ft_lock_offer',lender,floor,'fund_offer',{repayment:(11n*N/1000n).toString(),collateral:total.toString(),duration_ns:'1000000000'},N/100n);const id=x.value;
 x=await measure('ft_call_borrow',alice,floor,'ft_transfer_call',{receiver_id:receiver.accountId,amount:(N/10n).toString(),memo:null,msg:JSON.stringify({kind:'borrow',loan_id:id})},1n);
 assert.equal(await balance(receiver),'0');assert.equal((await view(floor,'get_loan',{loan_id:id})).state,1);assert.equal(x.value,(N/10n).toString());await new Promise(r=>setTimeout(r,1400));await measure('ft_locked_default',bob,floor,'default_loan',{loan_id:id});
});
for(const kind of ['accept','reject','malformed','panic','forward','repay','exhaust'])await test(`J: NFT receiver ${kind}`,async()=>{
 const id=await offer();const before=await view(floor,'accounting');
 const x=await measure('nft_call_'+kind,carol,floor,'nft_transfer_call',{receiver_id:receiver.accountId,token_id:id,approval_id:null,memo:null,msg:JSON.stringify({kind,to:dave.accountId,repayment:(11n*N/1000n).toString()})},1n);
 let owner=(await view(floor,'nft_token',{token_id:id})).owner_id;
 assert.equal(owner,kind==='accept'?receiver.accountId:kind==='forward'?dave.accountId:carol.accountId);
 assert.equal(x.ledger.L,before.L);assert.equal(x.ledger.T,before.T);assert.equal((await view(floor,'get_loan',{loan_id:id})).pending,0);
 if(kind==='accept')await measure('nft_return_owner',alice,receiver,'act',act('nft_transfer',{receiver_id:carol.accountId,token_id:id,approval_id:null,memo:null},'1'));
 const payer=kind==='forward'?dave:carol;await measure('nft_settle_'+kind,payer,floor,'repay',{loan_id:id},11n*N/1000n);
 if(['panic','repay','exhaust'].includes(kind))assert(x.r.receipts_outcome.some(x=>x.outcome.status.Failure));
});
await test('NFT default is blocked while transfer resolution is pending',async()=>{
 const id=await offer(N/10n,'1');const x=await measure('nft_call_default',carol,floor,'nft_transfer_call',{receiver_id:receiver.accountId,token_id:id,approval_id:null,memo:null,msg:JSON.stringify({kind:'default'})},1n);
 assert(x.r.receipts_outcome.some(x=>JSON.stringify(x.outcome.status).includes('NFT transfer pending')));assert.equal((await view(floor,'nft_token',{token_id:id})).owner_id,carol.accountId);await measure('after_pending_default',bob,floor,'default_loan',{loan_id:id});
});
await test('Private resolvers reject forged, duplicate and stale direct calls',async()=>{
 for(const m of ['ft_resolve_transfer','nft_resolve_transfer'])await measure('forged_'+m,alice,floor,m,{transfer_id:'0'},0n,true);
 await measure('forged_native_callback',alice,floor,'claim_result',{claim_id:'0',attempt:'0'},0n,true);
 await measure('self_call_no_promise_context',floor,floor,'claim_result',{claim_id:'0',attempt:'0'},0n,true);
});
await test('Measured storage shortage, refunds, unregister and cleanup',async()=>{
 const tiny=await account('tiny');const min=(await view(floor,'storage_balance_bounds')).min;
 await measure('register_tiny',tiny,floor,'storage_deposit',{account_id:null,registration_only:true},BigInt(min));
 await measure('insufficient_record_storage',tiny,floor,'fund_offer',{repayment:N.toString(),collateral:'1',duration_ns:'1000000000'},N,true);
 const sb=await view(floor,'storage_balance_of',{account_id:tiny.accountId});await measure('repeat_registration_refund',tiny,floor,'storage_deposit',{account_id:null,registration_only:true},N/10n);assert.deepEqual(await view(floor,'storage_balance_of',{account_id:tiny.accountId}),sb);
 await measure('force_unregister_with_tokens',alice,floor,'storage_unregister',{force:true},1n,true);
 await measure('storage_topup',tiny,floor,'storage_deposit',{account_id:null,registration_only:false},N/10n);
 await measure('storage_withdraw_all_available',tiny,floor,'storage_withdraw',{amount:null},1n);
 await measure('storage_unregister_empty',tiny,floor,'storage_unregister',{force:false},1n);assert.equal(await view(floor,'storage_balance_of',{account_id:tiny.accountId}),null);
 const x=await measure('cleanup_offer_fund',lender,floor,'fund_offer',{repayment:(N/100n).toString(),collateral:'1',duration_ns:'1'},N/100n);const id=x.value;
 const c=await measure('cleanup_cancel',lender,floor,'cancel_offer',{loan_id:id});await measure('cleanup_cancel_withdraw',lender,floor,'withdraw_claim',{claim_id:c.value});
 let y=await measure('cleanup_closed_loan',bob,floor,'cleanup_loan',{loan_id:id});assert(y.storage_delta<0);y=await measure('cleanup_paid_claim',bob,floor,'cleanup_claim',{claim_id:c.value});assert(y.storage_delta<0);
});
await test('Concurrent funded claims and wrong owner cannot redirect payout',async()=>{
 const x=await measure('claim_bob',bob,floor,'redeem',{amount:(N/10n).toString(),min_out:'1'});const y=await measure('claim_carol',carol,floor,'redeem',{amount:(N/10n).toString(),min_out:'1'});
 await measure('wrong_claim_owner',dave,floor,'withdraw_claim',{claim_id:x.value},0n,true);
 await Promise.all([measure('concurrent_bob',bob,floor,'withdraw_claim',{claim_id:x.value}),measure('concurrent_carol',carol,floor,'withdraw_claim',{claim_id:y.value})]);
 assert.equal((await view(floor,'get_claim',{claim_id:x.value})).state,3);assert.equal((await view(floor,'get_claim',{claim_id:y.value})).state,3);
});
await test('Failed native payout remains funded and safely retries after real failure',async()=>{
 const vanish=await account('vanish',10n*N);await vanish.deployContract(fixture);await measure('register_vanish',alice,floor,'storage_deposit',{account_id:vanish.accountId,registration_only:false},N);
 await measure('vanish_tokens',alice,floor,'ft_transfer',{receiver_id:vanish.accountId,amount:(N/10n).toString(),memo:null},1n);
 let x=await measure('vanish_offer',lender,floor,'fund_offer',{repayment:(11n*N/1000n).toString(),collateral:(N/10n).toString(),duration_ns:'3600000000000'},N/100n);const id=x.value;
 x=await measure('vanish_accept',alice,vanish,'act',act('accept_offer',{loan_id:id}));const cid=x.value;
 await measure('vanish_withdraw_delete',alice,vanish,'withdraw_and_disappear',{target:floor.accountId,claim_id:cid,beneficiary:alice.accountId});
 await new Promise(r=>setTimeout(r,1200));let c=await view(floor,'get_claim',{claim_id:cid});assert.equal(c.state,2,'native transfer should fail after receiver is deleted');
 const k=nearAPI.KeyPair.fromString(keys[vanish.accountId]);await root.createAccount(vanish.accountId,k.getPublicKey(),10n*N);await vanish.deployContract(fixture);
 await measure('retry_real_failed_claim',alice,vanish,'act',act('retry_failed_claim',{claim_id:cid}));await measure('withdraw_retried_claim',alice,vanish,'act',act('withdraw_claim',{claim_id:cid}));assert.equal((await view(floor,'get_claim',{claim_id:cid})).state,3);
});
await test('Callback gas failure never unlocks an unknown native payout',async()=>{
 const fault=await account('fault',20n*N);await fault.deployContract(fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline-fault.wasm')));await tx(root,fault,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});
 await tx(alice,fault,'storage_deposit',{account_id:null,registration_only:false},N);await tx(alice,fault,'issue',{min_tokens:'0'},N);
 const cid=result(await tx(alice,fault,'redeem',{amount:(N/10n).toString(),min_out:'1'}));const r=await tx(alice,fault,'withdraw_claim',{claim_id:cid});assert(failures(r).length>0);const c=await view(fault,'get_claim',{claim_id:cid});assert.equal(c.state,1);
 const retry=await tx(alice,fault,'retry_failed_claim',{claim_id:cid});assert(retry.status.Failure);assert((await tx(alice,fault,'withdraw_claim',{claim_id:cid})).status.Failure);
 evidence.push({name:'fault_build_callback_exhaustion',fault_injection:true,transaction_hash:r.transaction.hash,receipt_failures:failures(r),after:{account:await state(fault),ledger:await view(fault,'accounting')},claim:c});
 const slots=[];
 for(let i=0;i<9;i++){
  const u=await account('slot'+i);
  await tx(u,fault,'storage_deposit',{account_id:null,registration_only:false},N/10n);
  const refund=await tx(u,fault,'storage_withdraw',{amount:(N/100n).toString()},1n);
  assert(failures(refund).length>0);
  const user=await view(fault,'user_state',{account_id:u.accountId});
  assert.equal(user.refund_state,1);
  const again=await tx(u,fault,'storage_withdraw',{amount:'1'},1n);assert(again.status.Failure);
  slots.push({account:u.accountId,transaction_hash:refund.transaction.hash,user,receipts:refund.receipts_outcome});
 }
 const a=await view(fault,'accounting');assert(BigInt(a.account_balance)>=BigInt(a.local_required));
 evidence.push({name:'nine_isolated_unknown_refunds',slots,accounting:a});
});
await test('Minimum supported gas and preflight before payout dispatch',async()=>{
 const x=await measure('gas_claim',bob,floor,'redeem',{amount:(N/100n).toString(),min_out:'1'});
 const before=await view(floor,'get_claim',{claim_id:x.value});
 const low=await tx(bob,floor,'withdraw_claim',{claim_id:x.value},0n,109n*10n**12n);assert(low.status.Failure);
 assert.deepEqual(await view(floor,'get_claim',{claim_id:x.value}),before);
 const ok=await tx(bob,floor,'withdraw_claim',{claim_id:x.value},0n,110n*10n**12n);assert.equal(failures(ok).length,0);
 assert.equal((await view(floor,'get_claim',{claim_id:x.value})).state,3);
 evidence.push({name:'gas_envelope',low,ok});
});
await test('Ordinary gas stays bounded after growing persistent history',async()=>{
 const growth=[];for(let i=0;i<40;i++){const x=await measure(`growth_offer_${i}`,lender,floor,'fund_offer',{repayment:'100',collateral:'1',duration_ns:'1'},100n);if([0,19,39].includes(i))growth.push({i,gas:evidence.at(-1).gas_total,delta:evidence.at(-1).storage_delta});}
 const first=BigInt(growth[0].gas),last=BigInt(growth.at(-1).gas);assert(last<first*2n,'offer funding gas should not grow with historical rows');evidence.push({name:'growth_summary',measurements:growth});
});
await test('Growing users, active/closed loans and native claims stay bounded',async()=>{
 const growth=[];
 for(let i=0;i<12;i++){
  const u=await account('grow'+i);await measure(`growth_register_${i}`,alice,floor,'storage_deposit',{account_id:u.accountId,registration_only:false},N/10n);
  await measure(`growth_tokens_${i}`,alice,floor,'ft_transfer',{receiver_id:u.accountId,amount:'10',memo:null},1n);
  const x=await measure(`growth_fund_${i}`,lender,floor,'fund_offer',{repayment:'11',collateral:'1',duration_ns:i%2?'1':'3600000000000'},10n);const id=x.value;
  const c=await measure(`growth_accept_${i}`,u,floor,'accept_offer',{loan_id:id});
  if(i%2){await measure(`growth_default_${i}`,bob,floor,'default_loan',{loan_id:id});}
  else {await measure(`growth_nft_${i}`,u,floor,'nft_transfer',{receiver_id:dave.accountId,token_id:id,approval_id:null,memo:null},1n);const r=await measure(`growth_repay_${i}`,dave,floor,'repay',{loan_id:id},11n);await measure(`growth_lender_withdraw_${i}`,lender,floor,'withdraw_claim',{claim_id:r.value});}
  await measure(`growth_borrower_withdraw_${i}`,u,floor,'withdraw_claim',{claim_id:c.value});
  growth.push({i,accept_gas:evidence.find(x=>x.name===`growth_accept_${i}`).gas_total,records_so_far:evidence.length});
 }
 assert(BigInt(growth.at(-1).accept_gas)<BigInt(growth[0].accept_gas)*2n);evidence.push({name:'growth_users_loans_claims',measurements:growth});
});
}
