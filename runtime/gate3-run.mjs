// Controlled, unadvertised public TESTNET demonstration. Never creates a DAO.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import nearAPI from 'near-api-js';
const {connect,keyStores,KeyPair,transactions,utils}=nearAPI;
const ROOT=path.resolve(import.meta.dirname,'..'),N=10n**24n,EXPECTED='529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6';
const plan=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/planned-accounts.json'))),pub=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/public-keys.json'))).public_keys;
const budget=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/budget.json'))),file=path.join(ROOT,'TESTNET_EVIDENCE.json');
const parseNear=s=>{const [a,b='']=s.split('.');return BigInt(a)*N+BigInt(b.padEnd(24,'0'));};
const wasm=fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline.wasm'));
function artifact(){assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline.wasm'))).digest('hex'),EXPECTED,'STOP unauthorized artifact');}
artifact();const codeHash=utils.serialize.base_encode(Buffer.from(EXPECTED,'hex'));
const store=new keyStores.InMemoryKeyStore();for(const id of [plan.controller,...Object.values(plan.roles)]){const data=JSON.parse(fs.readFileSync(path.join(ROOT,'.testnet-credentials/testnet',id+'.json')));await store.setKey('testnet',id,KeyPair.fromString(data.private_key));}
const endpoint='https://test.rpc.fastnear.com';const near=await connect({networkId:'testnet',nodeUrl:endpoint,keyStore:store}),provider=near.connection.provider;
assert.equal((await provider.status()).chain_id,'testnet');
const accounts={controller:await near.account(plan.controller)};for(const [role,id]of Object.entries(plan.roles))accounts[role]=await near.account(id);
let data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{network:'testnet',status:'RUNNING_CORE_DEMO_DAO_PAUSED',artifact_sha256:EXPECTED,code_hash:codeHash,rpc:endpoint,operational_policy:'Unadvertised controlled-use demo. Payable methods remain publicly callable; no on-chain allowlist.',actual_accounts:{controller:plan.controller},transactions:[],intents:{},dao:{status:'PAUSED_AWAITING_GENUINE_COUNCIL_IDS_AND_PARTICIPATION',created:false,proposal_id:null,votes:[]},budget,checks:[]};
assert.equal(data.artifact_sha256,EXPECTED);if(data.status==='CORE_TESTNET_PASSED_DAO_PAUSED'){console.log('Core demo already completed; no transactions repeated. Use gate3-final-verify.mjs for read-only verification.');process.exit(0);}
if(data.stop_reason){if(!/429|DEPRECATED|timeout|fetch failed|validation rejection/i.test(data.stop_reason.message))throw Error('Manual review required before resuming this non-transport stop');(data.resolved_transport_stops??=[]).push(data.stop_reason);delete data.stop_reason;}data.rpc_history=[...new Set([data.rpc,...(data.rpc_history??[]),endpoint])];data.rpc=endpoint;data.status='RUNNING_CORE_DEMO_DAO_PAUSED';const save=()=>fs.writeFileSync(file,JSON.stringify(data,null,2));save();
async function rpc(method,params){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(30000)});return r.json();}
async function view(method,args={}){const r=await provider.query({request_type:'call_function',account_id:plan.roles.floor,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(r.result));}
async function state(id){return provider.query({request_type:'view_account',account_id:id,finality:'optimistic'});}
async function snapshot(){try{const account=await state(plan.roles.floor);if(account.code_hash!==codeHash)return {account,initialized:false};let ledger;try{ledger=await view('accounting');}catch{return {account,initialized:false};}
 const balances=Object.fromEntries(await Promise.all(Object.entries(plan.roles).map(async([role,id])=>[role,await view('ft_balance_of',{account_id:id})])));
 return {account,ledger,balances,initialized:true};}catch(e){if(e.type==='AccountDoesNotExist'||e.message.includes('does not exist'))return {exists:false};throw e;}}
function check(s){if(!s.initialized)return;assert.equal(s.account.code_hash,codeHash,'code changed');assert(BigInt(s.account.amount)>=BigInt(s.ledger.local_required),'STOP: cash invariant');assert(BigInt(s.ledger.storage_total)+BigInt(s.ledger.operational)>=BigInt(s.ledger.storage_stake),'STOP: storage funding');
 assert.equal(Object.values(s.balances).reduce((a,b)=>a+BigInt(b),0n).toString(),s.ledger.T,'STOP: supply/collateral invariant');assert.equal(s.balances.floor,s.ledger.locked);}
function value(r){return r.status.SuccessValue?JSON.parse(Buffer.from(r.status.SuccessValue,'base64')):null;}
async function finalize(hash,signer){for(let i=0;i<10;i++){const r=await rpc('tx',{tx_hash:hash,sender_account_id:signer,wait_until:'FINAL'});if(r.result)return r.result;await new Promise(r=>setTimeout(r,2000));}throw Error('Unknown transaction result; do not re-sign');}
async function send(name,signer,to,actions,{expectFailure=null,loanAction=false,allocation=null,method=null,args=null,deposit='0'}={}){
 const done=data.transactions.find(t=>t.name===name);if(done)return done;
 let intent=data.intents[name];if(intent?.transport_error?.type==='NotEnoughBalance'){(data.broadcast_validation_rejections??=[]).push({...intent,reason:'DEFINITIVE_PRE_EXECUTION_VALIDATION_REJECTION_NOT_AN_EXECUTED_TRANSACTION'});delete data.intents[name];intent=null;save();}
 const before=intent?.before??await snapshot();check(before);let outcome;
 if(intent){outcome=await finalize(intent.hash,intent.signer);}else{
  signer.accessKeyByPublicKeyCache={};const [bytes,signed]=await signer.signTransaction(to,actions);const hash=utils.serialize.base_encode(bytes);
  intent={hash,signer:signer.accountId,receiver:to,status:'SIGNED_BEFORE_BROADCAST',nonce:signed.transaction.nonce.toString(),before,method,args,deposit,allocation};data.intents[name]=intent;save();
  try{await provider.sendTransaction(signed);}catch(e){intent.transport_error={name:e.name,type:e.type,message:e.message};save();if(['InvalidNonce','Expired','NotEnoughBalance'].includes(e.type)){intent.status='REJECTED_BEFORE_EXECUTION';save();throw Error('Definitive validation rejection; inspect budget/nonce before retry');}}
  outcome=await finalize(hash,signer.accountId);
 }
 const after=await snapshot();const row={name,network:'testnet',rpc:endpoint,signer:signer.accountId,receiver:to,method,args,attached_deposit_yocto:deposit,allocation_NEAR:allocation,hash:intent.hash,explorer_url:`https://testnet.nearblocks.io/txns/${intent.hash}`,explorer_verified:false,outcome,gas_burnt:[outcome.transaction_outcome,...outcome.receipts_outcome].reduce((a,x)=>a+BigInt(x.outcome.gas_burnt),0n).toString(),before,after,value:value(outcome),expected_failure:expectFailure,completed_at:new Date().toISOString()};
 data.transactions.push(row);intent.status='FINAL';save();check(after);
 if(expectFailure){assert(outcome.status.Failure,`${name} should fail`);assert(JSON.stringify(outcome.status).includes(expectFailure),`${name}: wrong failure ${JSON.stringify(outcome.status)}`);}else assert(!outcome.status.Failure,`${name}: ${JSON.stringify(outcome.status)}`);
 if(loanAction&&before.initialized&&after.initialized){assert.equal(after.ledger.L,before.ledger.L,'STOP: loan changed backing');assert.equal(after.ledger.T,before.ledger.T,'STOP: loan changed supply');}
 if(expectFailure&&before.initialized&&after.initialized){assert.equal(after.ledger.L,before.ledger.L);assert.equal(after.ledger.T,before.ledger.T);}
 console.log(`${expectFailure?'EXPECTED_REJECTION':'PASS'} ${name} ${intent.hash}`);return row;
}
async function call(name,role,method,args={},deposit=0n,options={}){const gas=(method==='withdraw_claim'?110n:25n)*10n**12n;return send(name,accounts[role],plan.roles.floor,[transactions.functionCall(method,Buffer.from(JSON.stringify(args)),gas,deposit)],{...options,method,args,deposit:deposit.toString()});}
try{
 const controller=await state(plan.controller);const funding=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/evidence/funding.json')));const initial=BigInt(funding.after.result.amount);assert(BigInt(controller.amount)>=initial-parseNear(budget.core_total_cap_NEAR),'Operator budget already exceeded');
 for(const [role,id]of Object.entries(plan.roles)){
  let existing;try{existing=await state(id);}catch(e){if(e.type!=='AccountDoesNotExist'&&!e.message.includes('does not exist'))throw e;}
  if(!existing){const allocation=budget.role_allocations_NEAR[role];if(role==='floor')assert(parseNear(allocation)<=8n*N);const childKey=await store.getKey('testnet',id);const actions=[transactions.createAccount(),transactions.transfer(parseNear(allocation)),transactions.addKey(childKey.getPublicKey(),transactions.fullAccessKey())];
   if(role==='floor'){artifact();actions.push(transactions.deployContract(wasm),transactions.functionCall('new',Buffer.from(JSON.stringify({tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'})),50n*10n**12n,0n));}
   const row=await send('create_'+role,accounts.controller,id,actions,{allocation,method:role==='floor'?'CreateAccount+DeployContract+new':'CreateAccount'});
   if(role==='floor'){data.deployment={account_id:id,deployment_transaction:row.hash,initialization_transaction:row.hash,atomic_deploy_and_initialize:true,artifact_sha256:EXPECTED,code_hash:codeHash};save();}
  }
  const key=await provider.query({request_type:'view_access_key',account_id:id,public_key:pub[id],finality:'optimistic'});assert(key.permission==='FullAccess');data.actual_accounts[role]=id;save();
  const remaining=BigInt((await state(plan.controller)).amount);assert(initial-remaining<=parseNear(budget.core_total_cap_NEAR),'STOP: core budget exceeded');
 }
 artifact();let floorState=await state(plan.roles.floor);
 if(floorState.code_hash==='11111111111111111111111111111111'){artifact();const row=await send('deploy_normal_and_initialize',accounts.floor,plan.roles.floor,[transactions.deployContract(wasm),transactions.functionCall('new',Buffer.from(JSON.stringify({tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'})),50n*10n**12n,0n)],{method:'DeployContract+new'});data.deployment={account_id:plan.roles.floor,deployment_transaction:row.hash,initialization_transaction:row.hash,atomic_deploy_and_initialize:true,artifact_sha256:EXPECTED,code_hash:codeHash};save();}
 assert.equal((await state(plan.roles.floor)).code_hash,codeHash,'STOP: unexpected deployed code');
 const initialized=data.transactions.find(t=>t.name==='create_floor'&&t.after.initialized)?.after??data.transactions.find(t=>t.name==='deploy_normal_and_initialize')?.after;assert(initialized,'No recorded initialization');assert.equal(initialized.ledger.L,'0');assert.equal(initialized.ledger.T,'0');
 for(const [role,n]of Object.entries(budget.gas_liquidity_topups_NEAR??{})){await send('gas_liquidity_topup_'+role,accounts.controller,plan.roles[role],[transactions.transfer(parseNear(n))],{allocation:n,method:'Transfer'});assert(initial-BigInt((await state(plan.controller)).amount)<=parseNear(budget.core_total_cap_NEAR),'STOP: core budget exceeded');}
 for(const role of ['alice','bob','carol','dave','lender'])await call('register_'+role,role,'storage_deposit',{account_id:null,registration_only:false},N/20n);
 await call('alice_issue','alice','issue',{min_tokens:(2n*N).toString()},2n*N);
 await call('alice_to_bob','alice','ft_transfer',{receiver_id:plan.roles.bob,amount:(4n*N/10n).toString(),memo:null},1n);
 await call('alice_to_carol','alice','ft_transfer',{receiver_id:plan.roles.carol,amount:(N/2n).toString(),memo:null},1n);
 const red=await call('bob_redeem','bob','redeem',{amount:(N/10n).toString(),min_out:'1'});assert(BigInt(red.after.ledger.L)*BigInt(red.before.ledger.T)>BigInt(red.before.ledger.L)*BigInt(red.after.ledger.T),'backing did not increase');
 await call('bob_withdraw','bob','withdraw_claim',{claim_id:red.value});assert.equal((await view('get_claim',{claim_id:red.value})).state,3);
 await call('bob_duplicate_withdraw','bob','withdraw_claim',{claim_id:red.value},0n,{expectFailure:'claim not available'});
 await call('reject_dilutive_issuance','alice','issue',{min_tokens:'0'},N/20n,{expectFailure:'dilutive issuance'});
 const offer=await call('lender_offer','lender','fund_offer',{repayment:(11n*N/100n).toString(),collateral:(N/5n).toString(),duration_ns:'3600000000000'},N/10n,{loanAction:true});
 const accepted=await call('carol_accept','carol','accept_offer',{loan_id:offer.value},0n,{loanAction:true});
 await call('carol_principal_withdraw','carol','withdraw_claim',{claim_id:accepted.value},0n,{loanAction:true});
 await call('carol_to_dave_nft','carol','nft_transfer',{receiver_id:plan.roles.dave,token_id:offer.value,approval_id:null,memo:null},1n,{loanAction:true});assert.equal((await view('nft_token',{token_id:offer.value})).owner_id,plan.roles.dave);
 await call('reject_old_owner_repay','carol','repay',{loan_id:offer.value},11n*N/100n,{expectFailure:'not NFT owner',loanAction:true});
 const repay=await call('dave_repay','dave','repay',{loan_id:offer.value},11n*N/100n,{loanAction:true});assert.equal(repay.after.balances.dave,(N/5n).toString());assert.equal(await view('nft_token',{token_id:offer.value}),null);
 await call('lender_withdraw','lender','withdraw_claim',{claim_id:repay.value},0n,{loanAction:true});
 await call('reject_double_repay','dave','repay',{loan_id:offer.value},11n*N/100n,{expectFailure:'loan not active',loanAction:true});
 await call('reject_default_after_repay','bob','default_loan',{loan_id:offer.value},0n,{expectFailure:'loan not active',loanAction:true});
 const def=await call('default_offer','lender','fund_offer',{repayment:(55n*N/1000n).toString(),collateral:(N/10n).toString(),duration_ns:'60000000000'},N/20n,{loanAction:true});
 const defAccept=await call('default_accept','carol','accept_offer',{loan_id:def.value},0n,{loanAction:true});
 await call('default_principal_withdraw','carol','withdraw_claim',{claim_id:defAccept.value},0n,{loanAction:true});
 const loan=await view('get_loan',{loan_id:def.value});const expiry=BigInt(loan.expiry);data.default_expiry_ns=loan.expiry;save();
 for(;;){const block=await provider.block({finality:'optimistic'});if(BigInt(block.header.timestamp_nanosec)>=expiry)break;console.log('WAIT actual testnet chain time for default');await new Promise(r=>setTimeout(r,5000));}
 const defaulted=await call('permissionless_default','bob','default_loan',{loan_id:def.value},0n,{loanAction:true});assert.equal(defaulted.after.balances.lender,(N/10n).toString());assert.equal(await view('nft_token',{token_id:def.value}),null);
 await call('reject_repay_after_default','carol','repay',{loan_id:def.value},55n*N/1000n,{expectFailure:'loan not active',loanAction:true});
 await call('reject_double_default','bob','default_loan',{loan_id:def.value},0n,{expectFailure:'loan not active',loanAction:true});
 data.status='CORE_TESTNET_PASSED_DAO_PAUSED';data.final_state=await snapshot();check(data.final_state);data.checks.push({core_scenarios:'PASSED',dao:'NOT_EXECUTED_NO_GENUINE_COUNCIL',third_party_deposits:'not solicited; methods publicly callable',access_keys:'retained',frontend:'not built'});save();console.log('CORE TESTNET COMPLETE; DAO remains paused.');
}catch(e){data.status='STOPPED_REQUIRES_REVIEW';data.stop_reason={message:e.message,stack:e.stack};save();console.error(e.message);process.exitCode=1;}
