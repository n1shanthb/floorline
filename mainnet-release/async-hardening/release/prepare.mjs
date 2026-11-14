// Unsigned preparation and read-only reconciliation. No signer, key store,
// broadcasting, account creation or deployment implementation is imported.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir=import.meta.dirname,base=path.resolve(dir,'..'),N=10n**24n;
const expected='31f85eac588646f65b07c8b90566457f797f71b479b4d6c9a78b892912ba326b';
const code='4N4dvutiEhBVHMZvLupafQQM5ACyXWAQWkuUmvD6K7az';
const artifact=path.join(base,'runtime/evidence/release-rc1/new-normal.wasm');
const bytes=fs.readFileSync(artifact);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'Only the frozen normal artifact is permitted');
const limits={max_action:(N/100n).toString(),max_gross:(N/20n).toString(),max_storage:(N/50n).toString()};
const steps=[];
const ref=id=>({$result:id});
function step(id,signer,method,args={},deposit='0',extra={}){steps.push({id,signer_role:signer,receiver_role:'contract',method,args,deposit,gas:'110000000000000',...extra})}
for(const role of ['holder','borrower','nft_holder','lender'])step('register_'+role,role,'storage_deposit',{account_id:null,registration_only:false},limits.max_storage);
step('issue','holder','issue',{min_tokens:(N/100n).toString()},(N/100n).toString());
step('collateral_to_borrower','holder','ft_transfer',{receiver_id:{$account:'borrower'},amount:(3n*N/1000n).toString(),memo:null},'1');
step('redeem','holder','redeem',{amount:(N/1000n).toString(),min_out:{$fresh_quote:'redeem'}},'0',{review:'Read fresh quote; set min_out to reviewed quote before signing.'});
step('withdraw_redemption','holder','withdraw_claim',{claim_id:ref('redeem')});
step('offer_repay','lender','fund_offer',{repayment:(22n*N/10000n).toString(),collateral:(N/1000n).toString(),duration_ns:'86400000000000'},(N/500n).toString());
step('borrow_repay','borrower','accept_offer',{loan_id:ref('offer_repay')});
step('withdraw_principal','borrower','withdraw_claim',{claim_id:ref('borrow_repay')});
step('nft_transfer','borrower','nft_transfer',{receiver_id:{$account:'nft_holder'},token_id:ref('offer_repay'),approval_id:null,memo:null},'1');
step('repay','nft_holder','repay',{loan_id:ref('offer_repay')},(22n*N/10000n).toString());
step('withdraw_repayment','lender','withdraw_claim',{claim_id:ref('repay')});
step('offer_default','lender','fund_offer',{repayment:(22n*N/10000n).toString(),collateral:(N/1000n).toString(),duration_ns:'120000000000'},(N/500n).toString());
step('borrow_default','borrower','accept_offer',{loan_id:ref('offer_default')});
step('withdraw_default_principal','borrower','withdraw_claim',{claim_id:ref('borrow_default')});
step('default','holder','default_loan',{loan_id:ref('offer_default')},'0',{not_before:'get_loan.expiry finalized chain timestamp; no wall-clock assumption'});
step('offer_cancel','lender','fund_offer',{repayment:(N/1000n).toString(),collateral:(N/10000n).toString(),duration_ns:'600000000000'},(N/1000n).toString());
step('cancel','lender','cancel_offer',{loan_id:ref('offer_cancel')});
step('withdraw_cancel','lender','withdraw_claim',{claim_id:ref('cancel')});
step('contribute','holder','contribute',{},(N/1000n).toString());
for(const id of ['redeem','borrow_repay','repay','borrow_default','cancel'])step('cleanup_'+id,'holder','cleanup_claim',{claim_id:ref(id)});
for(const id of ['offer_repay','offer_default','offer_cancel'])step('cleanup_'+id,'holder','cleanup_loan',{loan_id:ref(id)});
step('return_free_tokens','borrower','ft_transfer',{receiver_id:{$account:'holder'},amount:(N/1000n).toString(),memo:null},'1');
step('withdraw_storage','borrower','storage_withdraw',{amount:(N/1000n).toString()},'1');
step('unregister','borrower','storage_unregister',{force:false},'1');
step('stop','controller','stop_new_risk',{},'0',{review:'Irreversible. Execute only after all approved new-risk actions finish.'});
const source=fs.readFileSync(path.join(base,'src/contract.rs'),'utf8');for(const x of steps)assert(source.includes('pub fn '+x.method+'('),'Unknown ABI method '+x.method);
const json=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2));
if(process.argv[2]==='--reconcile'){
 const j=JSON.parse(fs.readFileSync(process.argv[3]));
 for(const entry of j.transactions){const r=entry.result??entry;assert(entry.intent,'Reviewed intent is required');assert.equal(r.final_execution_status,'FINAL','Unknown/nonfinal outcome: STOP; no resend');assert.equal(r.transaction.signer_id,entry.intent.signer,'Signer mismatch');assert.equal(r.transaction.receiver_id,entry.intent.receiver,'Receiver mismatch');const calls=r.transaction.actions.filter(a=>a.FunctionCall).map(a=>a.FunctionCall);assert.equal(calls.length,1,'Review non-function-call/atomic deployment actions separately');assert.equal(calls[0].method_name,entry.intent.method);assert.equal(calls[0].deposit,entry.intent.deposit);assert.deepEqual(JSON.parse(Buffer.from(calls[0].args,'base64')),entry.intent.args);assert(r.status.SuccessValue!==undefined,'Failed transaction: STOP');for(const o of [r.transaction_outcome,...r.receipts_outcome])assert(!o.outcome.status.Failure,'Child receipt failed: STOP')}
 for(const s of j.snapshots){const a=s.account??{},l=s.ledger;let required=0n;for(const k of ['L','unused_lender','storage_total','operational','borrower_claims','lender_claims','redemption_claims','cancellation_claims','storage_refund_claims'])required+=BigInt(l[k]);assert.equal(required,BigInt(l.local_required));assert(BigInt(a.amount??l.account_balance)>=required);assert(BigInt(l.storage_total)+BigInt(l.operational)>=BigInt(l.storage_stake))}
 console.log('Reviewed function-call intent, FINAL receipt success and supplied snapshot solvency verified. Atomic creation/deployment action lists, code/key proofs and complete discovery require their separate checks.');
}else{
 const owner=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):null;
 const submitted=owner;
 if(owner){assert(owner.network==='testnet'||owner.network==='mainnet');for(const role of ['controller','contract','holder','borrower','nft_holder','lender']){assert(/^[a-z0-9._-]{2,64}$/.test(owner.accounts[role]),'Missing public role '+role);if(owner.network==='testnet')assert(owner.accounts[role].endsWith('.testnet'))}assert(owner.accounts.contract.endsWith('.'+owner.accounts.controller),'New child must be owned by approved controller');assert(owner.contract_public_key?.startsWith('ed25519:'),'Public deployment key required');assert(!JSON.stringify(owner).includes('secret_key'));assert(!JSON.stringify(owner).includes('private_key'))}
 if(owner){
  assert.equal(new Set(Object.values(owner.accounts)).size,6,'All six roles must use distinct accounts');
  assert(owner.controller_public_key?.startsWith('ed25519:'),'Controller public key required');
  for(const role of ['holder','borrower','nft_holder','lender'])assert(owner.actor_public_keys?.[role]?.startsWith('ed25519:'),'Actor public key required for '+role);
  const url=owner.network==='testnet'?'https://rpc.testnet.near.org':'https://rpc.mainnet.near.org';
  const read=async(method,params)=>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'unsigned-preflight',method,params})});assert(r.ok,'RPC HTTP failure');return r.json()};
  const status=await read('status',[]);assert.equal(status.result?.chain_id,owner.network,'Wrong RPC network');
  const availability=await read('query',{request_type:'view_account',account_id:owner.accounts.contract,finality:'final'});
  assert(['UNKNOWN_ACCOUNT','AccountDoesNotExist'].includes(availability.error?.cause?.name),'New account availability is not established; STOP');
  const keys=await read('query',{request_type:'view_access_key_list',account_id:owner.accounts.controller,finality:'final'});assert(keys.result?.keys?.length,'Controller key policy unavailable');
  assert(keys.result.keys.some(k=>k.public_key===owner.controller_public_key&&k.access_key.permission==='FullAccess'),'Controller FullAccess key mismatch');
  const actors={};
  for(const role of ['holder','borrower','nft_holder','lender']){const result=await read('query',{request_type:'view_access_key_list',account_id:owner.accounts[role],finality:'final'});assert(result.result?.keys?.some(k=>k.public_key===owner.actor_public_keys[role]&&k.access_key.permission==='FullAccess'),'Actor signing authority mismatch: '+role);actors[role]=result}
  const config=await read('EXPERIMENTAL_protocol_config',{finality:'final'}),gas=await read('gas_price',{block_id:null});
  const prior=JSON.parse(fs.readFileSync(path.join(base,'runtime/evidence/release-rc1',owner.network+'-costs.json')));
  assert.equal(config.result?.runtime_config.storage_amount_per_byte,prior.EXPERIMENTAL_protocol_config.result.runtime_config.storage_amount_per_byte,'Storage quote changed: regenerate budget');
  assert(BigInt(gas.result.gas_price)<=BigInt(prior.EXPERIMENTAL_protocol_config.result.runtime_config.min_gas_purchase_price),'Gas quote exceeded reservation: regenerate budget');
  json(path.join(dir,'owner-preflight.json'),{network:owner.network,status,availability,keys,actors,config,gas,authorization:'READ_ONLY_ONLY',signing_key_binding_verified:true});
 }
 for(const network of ['testnet','mainnet']){
  const owner=submitted?.network===network?submitted:null;
  const config={network,approval_status:'OWNER_APPROVAL_REQUIRED',accounts:owner?.network===network?owner.accounts:{controller:null,contract:null,holder:null,borrower:null,nft_holder:null,lender:null},contract_public_key:owner?.contract_public_key??null,expected_sha256:expected,expected_code_hash:code,artifact,limits_proposed:limits,limits_approved:false,key_policy:'Owner-controlled FullAccess retained during acceptance; not immutable/ownerless. No key deletion authorized. Review any mainnet custody separately.',new_account_required:true,preflight:['Confirm account does not exist using finalized view_account; only AccountDoesNotExist establishes availability','Read network status/chain ID and protocol config; verify expected byte price','Verify controller signing authority and every actor public key/owner; never request private keys in chat','Owner must approve limits, calculated funding ceiling, account IDs and retained-key policy'],funding:{ceiling_yocto:'0',contract_allocation_yocto:(8n*N).toString(),actor_allocations_yocto:Object.fromEntries(['holder','borrower','nft_holder','lender'].map(r=>[r,(N/2n).toString()])),controller_gas_contingency_yocto:(3n*N/4n).toString(),storage_upper_bytes:bytes.length+8192+65536,operating_liquidity_yocto:(5n*N/2n).toString(),note:'Funding is calculated below before this manifest is written.'},atomic_creation_deployment:{receiver_role:'contract',actions:[{type:'CreateAccount'},{type:'Transfer',deposit:(8n*N).toString()},{type:'AddKey',public_key:owner?.contract_public_key??null,permission:'FullAccess'},{type:'DeployContract',normal_wasm_file:artifact,sha256:expected},{type:'FunctionCall',method_name:'new',args:{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1',pilot_limits:limits},deposit:'0',gas:'110000000000000'}]},actor_funding:['holder','borrower','nft_holder','lender'].map(role=>({signer_role:'controller',receiver_role:role,actions:[{type:'Transfer',deposit:(N/2n).toString()}],requires:'Existing owner-controlled actor account with verified public key; creating actors requires separately specified public-key actions and approval.'})),acceptance:steps,signing_implemented:false,unknown_outcome_policy:'STOP, retain signed hash/nonce if signing later occurs, reconcile full receipts through independent RPCs; never rebuild/re-sign/resend on timeout.',receipt_variable_policy:'$result/$account/$fresh_quote are unresolved templates. Resolve only from finalized verified prior receipt and fresh block-pinned views, then review before each signature.',post_deployment_checks:['view_code SHA256/code hash exact normal artifact','view_access_key_list equals approved public-key policy','pilot_status guardian equals controller, limits match immutable approved values, gross=0/stopped=false','admission_status occupied=0/capacity=128/exit reserve correct','accounting L=T=I=H=0, actual cash>=required, storage coverage','Record complete intent, root transaction and child receipts for each action','Wallet/network/code hash verified before enabling staging']};
  const quoted=JSON.parse(fs.readFileSync(path.join(base,'runtime/evidence/release-rc1',network+'-costs.json')));
  const bytePrice=BigInt(quoted.EXPERIMENTAL_protocol_config.result.runtime_config.storage_amount_per_byte);
  const spot=BigInt(quoted.gas_price.result.gas_price),purchase=BigInt(quoted.EXPERIMENTAL_protocol_config.result.runtime_config.min_gas_purchase_price);
  const price=spot>purchase?spot:purchase,round=N/100n;
  const allocations={};
  for(const role of ['holder','borrower','nft_holder','lender']){
    const calls=steps.filter(s=>s.signer_role===role),deposits=calls.reduce((n,s)=>n+BigInt(s.deposit),0n);
    const raw=BigInt(calls.length)*120000000000000n*price+deposits+N/10n;
    allocations[role]=(((raw+round-1n)/round)*round).toString();
  }
  const ceiling=8n*N+3n*N/4n+Object.values(allocations).reduce((n,s)=>n+BigInt(s),0n);
  const storageUpper=BigInt(config.funding.storage_upper_bytes)*bytePrice;
  assert(storageUpper+5n*N/2n<=8n*N,'Contract allocation insufficient at quoted storage price');
  config.funding.ceiling_yocto=ceiling.toString();config.funding.actor_allocations_yocto=allocations;
  config.funding.pricing={quote_utc:quoted.queried_at_utc,storage_byte_yocto:bytePrice.toString(),spot_gas_price:spot.toString(),minimum_purchase_gas_price:purchase.toString(),reservation_price:price.toString(),gas_reservation_per_call:'120000000000000',gas_note:'110 Tgas function envelope plus 10 Tgas scheduling/action-fee allowance; each actor also receives 0.1 NEAR buffer, rounded upward to 0.01 NEAR.'};
  config.funding.storage_upper_yocto=storageUpper.toString();config.funding.contract_allocation_margin_yocto=(8n*N-storageUpper-5n*N/2n).toString();
  config.funding.note='All financial and storage deposits, auth yoctoNEAR and actor gas reservations come from these actor allocations; do not add them again.';
  config.actor_funding.forEach(x=>{x.actions[0].deposit=allocations[x.receiver_role]});
  const ceilingText=(ceiling/N).toString()+'.'+((ceiling%N)/(N/100n)).toString().padStart(2,'0');
  config.preflight.push('Funding ceiling requiring owner approval: '+ceilingText+' NEAR; no signing authorization is implied.');
  json(path.join(dir,network+'-manifest.json'),config);
 }
 json(path.join(dir,'acceptance-plan.json'),{transactions:steps.length+5,breakdown:'1 atomic contract creation/deploy/init; 4 actor funding transfers; '+steps.length+' financial/control methods',planned_new_risk_gross_yocto:(16n*N/1000n).toString(),planned_repayment_yocto:(22n*N/10000n).toString(),planned_initial_storage_yocto:(8n*N/100n).toString(),steps});
 console.log('Prepared unsigned testnet/mainnet review manifests with funding derived from each network quote and role transaction count. No signing or public-network write is implemented.');
}
