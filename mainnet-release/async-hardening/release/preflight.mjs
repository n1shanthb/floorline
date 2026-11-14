// Read-only RC1 preflight: explicit public RPC allowlist, no signer/credential imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir=import.meta.dirname,base=path.resolve(dir,'..'),root=path.resolve(base,'../..');
const out=path.join(dir,'acceptance-preparation-20261114');fs.mkdirSync(out,{recursive:true});
const save=(n,x)=>fs.writeFileSync(path.join(out,n),JSON.stringify(x,null,2));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(base+'/runtime/evidence/release-rc1/new-normal.wasm');
assert.equal(hash(bytes),'31f85eac588646f65b07c8b90566457f797f71b479b4d6c9a78b892912ba326b');assert.equal(bytes.length,453798);
const manifest=JSON.parse(fs.readFileSync(dir+'/testnet-manifest.json')),plan=JSON.parse(fs.readFileSync(dir+'/acceptance-plan.json'));
assert.equal(plan.transactions,39);assert.equal(plan.steps.length,34);assert.equal(plan.steps.at(-2).method,'stop_new_risk');
const old=JSON.parse(fs.readFileSync(root+'/TESTNET_EVIDENCE.json')).actual_accounts;
const roles={controller:old.controller,contract:'rc1.'+old.controller,holder:old.alice,borrower:old.carol,nft_holder:old.dave,lender:old.lender};
assert.equal(new Set(Object.values(roles)).size,6);assert.notEqual(roles.contract,old.floor);
const endpoint='https://rpc.testnet.near.org';
const prior=process.argv.includes('--offline')?JSON.parse(fs.readFileSync(out+'/rpc.json')):null;
const read=async(method,params)=>{assert(['status','query','EXPERIMENTAL_protocol_config','gas_price'].includes(method));if(prior){if(method==='status')return prior.status;if(method==='EXPERIMENTAL_protocol_config')return prior.protocol;if(method==='gas_price')return prior.gas;const item=Object.values(prior.accounts).find(x=>x.account===params.account_id);assert(item);return params.request_type==='view_account'?item.state:item.keys;}const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'rc1-readonly',method,params}),signal:AbortSignal.timeout(25000)});assert(r.ok);return r.json()};
const raw={queried_at_utc:prior?.queried_at_utc??new Date().toISOString(),endpoint,status:await read('status',[])};assert.equal(raw.status.result?.chain_id,'testnet');
raw.protocol=await read('EXPERIMENTAL_protocol_config',{finality:'final'});raw.gas=await read('gas_price',{block_id:null});assert(raw.protocol.result&&raw.gas.result);
raw.accounts={};
for(const [role,account] of Object.entries(roles)){
 const state=await read('query',{request_type:'view_account',account_id:account,finality:'final'});
 const keys=role==='contract'?null:await read('query',{request_type:'view_access_key_list',account_id:account,finality:'final'});
 raw.accounts[role]={account,state,keys};
}
save('rpc.json',raw);
const action=BigInt(manifest.limits_proposed.max_action),grossLimit=BigInt(manifest.limits_proposed.max_gross),storageLimit=BigInt(manifest.limits_proposed.max_storage);
let gross=0n;const seen=new Set(),checks=[];
for(const step of plan.steps){
 for(const ref of JSON.stringify(step.args).matchAll(/"\$result":"([^"]+)"/g))assert(seen.has(ref[1]),'Forward/missing receipt reference');
 if(step.method==='storage_deposit')assert(BigInt(step.deposit)<=storageLimit);
 if(['issue','contribute','fund_offer'].includes(step.method)){assert(BigInt(step.deposit)>0n&&BigInt(step.deposit)<=action);gross+=BigInt(step.deposit);assert(gross<=grossLimit)}
 if(step.method==='fund_offer'){assert(BigInt(step.args.repayment)<=action);assert(BigInt(step.args.repayment)>=BigInt(step.deposit))}
 if(!['storage_deposit','stop_new_risk'].includes(step.method))assert(seen.has('register_'+step.signer_role));
 checks.push({id:step.id,prior_steps:[...seen],intent:step,postconditions:['FINAL root and every child receipt success','Resolve returned IDs only from verified SuccessValue','Block-pinned accounting: sum liabilities=local_required; cash>=required; storage_total+operational>=storage stake; preserve inflight separately','Refresh role token/NFT/claim/loan rights and gross; STOP on unknown, never resend']});seen.add(step.id);
}
assert.equal(gross,16000000000000000000000n);assert.equal(plan.steps.find(x=>x.id==='repay').deposit,plan.steps.find(x=>x.id==='offer_repay').args.repayment);
const registration=JSON.parse(fs.readFileSync(base+'/runtime/evidence/release-rc1/runtime.json'));
const firstRegistration=registration.evidence.find(e=>e.method==='storage_deposit'&&!e.expected_failure);const registered=JSON.parse(Buffer.from(firstRegistration.final_status.SuccessValue,'base64'));const measuredMinimum=BigInt(registered.total)-BigInt(registered.available);assert(storageLimit>=measuredMinimum);save('registration-review.json',{frozen_sandbox_minimum:measuredMinimum.toString(),proposed_credit:storageLimit.toString(),live_bound_read_required:true,cleanup_order:'Each paid claim and closed loan is cleaned before the next offer; no cap increase.'});
// Frozen runtime evidence supplies measured registration costs; a deployed RC1 must re-read bounds.
const byte=BigInt(raw.protocol.result.runtime_config.storage_amount_per_byte),spot=BigInt(raw.gas.result.gas_price),purchase=BigInt(raw.protocol.result.runtime_config.min_gas_purchase_price),price=spot>purchase?spot:purchase,N=10n**24n,round=N/100n;
const allocations={};let total=8n*N+3n*N/4n;
for(const role of ['holder','borrower','nft_holder','lender']){const calls=plan.steps.filter(s=>s.signer_role===role),deposits=calls.reduce((a,s)=>a+BigInt(s.deposit),0n);const gas=BigInt(calls.length)*120000000000000n*price;const allocation=((gas+deposits+N/10n+round-1n)/round)*round;allocations[role]={calls:calls.length,deposits:deposits.toString(),gas_reservation:gas.toString(),allocation:allocation.toString()};total+=allocation}
const storage=BigInt(bytes.length+8192+65536)*byte,exit=65536n*byte,contractSufficient=storage+5n*N/2n<=8n*N;
const controller=raw.accounts.controller,fullKeys=controller.keys?.result?.keys?.filter(k=>k.access_key.permission==='FullAccess').map(k=>k.public_key)??[];
const available=['UNKNOWN_ACCOUNT','AccountDoesNotExist'].includes(raw.accounts.contract.state.error?.cause?.name);
const actorKeys=Object.fromEntries(['holder','borrower','nft_holder','lender'].map(role=>[role,raw.accounts[role].keys?.result?.keys?.filter(k=>k.access_key.permission==='FullAccess').map(k=>k.public_key)??[]]));
const ownerReady=fullKeys.length>0&&Object.values(actorKeys).every(x=>x.length>0)&&available;
const candidate={network:'testnet',rpc:endpoint,secondary_read_rpc:'https://test.rpc.fastnear.com',accounts:roles,controller_public_key:fullKeys.length===1?fullKeys[0]:null,contract_public_key:null,actor_public_keys:Object.fromEntries(Object.entries(actorKeys).map(([r,k])=>[r,k.length===1?k[0]:null])),public_key_candidates:{controller:fullKeys,...actorKeys},owner_control_confirmed:false,selected_contract_key_approved:false,account_selection_approved:false,budget_approved:false,limits_approved:false,key_policy_approved:false,initialization:manifest.atomic_creation_deployment.actions.at(-1),expected_code_hash:manifest.expected_code_hash,expected_sha256:manifest.expected_sha256,availability_established_at_snapshot:available,status:ownerReady?'PUBLIC_ACCOUNT_CANDIDATES_FOUND_OWNER_SELECTION_REQUIRED':'BLOCKED_PUBLIC_STATE_OR_KEYS',note:'Historical project role mapping only; public keys do not prove current signing control. No credentials accessed. New deployment key must be selected/approved by owner; none generated.'};save('owner-candidate.json',candidate);
const budget={quote_utc:raw.queried_at_utc,protocol:raw.protocol.result.protocol_version,byte_price:byte.toString(),spot_gas_price:spot.toString(),minimum_purchase_price:purchase.toString(),allocations,required_ceiling:total.toString(),proposed_ceiling:'13240000000000000000000000',contract_storage_upper:storage.toString(),protected_exit_reserve_included:exit.toString(),operating_reserve:(5n*N/2n).toString(),contract_margin:(8n*N-storage-5n*N/2n).toString(),within_proposed:total<=13240000000000000000000000n&&contractSufficient,actual_spent:'0',note:'Transfers to contract/actors retain funds; storage is staked not burned. Gas reservations are conservative funding, not measured spend. Refresh quotes and controller funding availability before signature.'};save('budget.json',budget);
const batch=structuredClone(manifest.atomic_creation_deployment);batch.signer_id=roles.controller;batch.receiver_id=roles.contract;batch.actions.find(x=>x.type==='AddKey').public_key=null;batch.blockers=['Owner-approved fresh receiver and FullAccess public key absent','No nonce, recent block hash or signature assigned','Availability and balances must be refreshed before signing'];save('unsigned-intentions.json',{status:'UNSIGNED_NOT_BROADCASTABLE',atomic:batch,actor_funding:manifest.actor_funding,steps:checks,receipt_ids_unresolved:true,post_stop_public_exit_test:'Transaction 38 irreversible stop; transaction 39 borrower storage_unregister refunds remaining funded storage credit after all rights are cleaned. Require FINAL refund transfer AND callback, zero borrower storage/admission release, native credit and solvency.'});
const summary={artifact:'VERIFIED',account_preflight:'BLOCKED_OWNER_SELECTION_AND_KEY',caps:'PASS_STATIC_GRAPH',gross:gross.toString(),budget:budget.within_proposed?'SUFFICIENT_AT_QUOTED_MODEL':'INSUFFICIENT',atomic:'BLOCKED_OWNER_CONFIGURATION',graph:'BLOCKED_RECEIPT_IDS_AND_CONFIGURATION',staging:'BLOCKED_FRESH_ACCOUNT_CONFIGURATION',audit:'PENDING',mainnet:'NOT_AUTHORIZED',public_signatures:0,public_writes:0,financial_source_unchanged:true};save('summary.json',summary);console.log(JSON.stringify({summary,candidate_accounts:roles,budget},null,2));