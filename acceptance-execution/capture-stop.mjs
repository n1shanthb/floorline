// Public read-only stop reconciliation. No SDK, wallet, keys or broadcasts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='TESTNET_ACCEPTANCE_TRANSACTIONS.json',j=JSON.parse(fs.readFileSync(file));
assert(j.transactions.at(-1).name==='carol_repayment_principal');
const endpoint='https://rpc.testnet.near.org';
const F='floor.floorline-g3-20261111-6702ea.testnet',D='floorline-g3-20261111-6702ea.sputnikv2.testnet';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function rpc(method,params){await delay(600);const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'stop-reconciliation-read-only',method,params}),signal:AbortSignal.timeout(15000)});assert(r.ok);const d=await r.json();assert(!d.error,JSON.stringify(d.error));return d.result;}
assert.equal((await rpc('status',[])).chain_id,'testnet');
const block=(await rpc('block',{finality:'final'})).header;
const query=id=>rpc('query',{request_type:'view_account',account_id:id,block_id:block.hash});
async function view(id,method,args={}){const r=await rpc('query',{request_type:'call_function',account_id:id,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),block_id:block.hash});return JSON.parse(Buffer.from(r.result));}
const s={block,endpoint,account:await query(F),daoAccount:await query(D),ledger:await view(F,'accounting'),policy:await view(D,'get_policy'),last:await view(D,'get_last_proposal_id'),roles:{},loans:{},nfts:{},claims:{}};
assert.equal(s.account.code_hash,j.preflight.account.code_hash);assert.equal(s.daoAccount.code_hash,j.preflight.daoAccount.code_hash);assert.deepEqual(s.policy,j.preflight.policy);
for(const [role,old] of Object.entries(j.preflight.roles)){const id=old.account_id;s.roles[role]={account_id:id,native:await query(id),floor:await view(F,'ft_balance_of',{account_id:id}),storage:await view(F,'storage_balance_of',{account_id:id}),user:await view(F,'user_state',{account_id:id})};}
for(const id of j.known_loans){s.loans[id]=await view(F,'get_loan',{loan_id:id});s.nfts[id]=await view(F,'nft_token',{token_id:id});}for(const id of j.known_claims)s.claims[id]=await view(F,'get_claim',{claim_id:id});
const sum=xs=>xs.reduce((a,x)=>a+BigInt(x),0n),l=s.ledger;
assert.equal(sum(['L','unused_lender','borrower_claims','lender_claims','redemption_claims','cancellation_claims','storage_refund_claims','storage_total','operational'].map(k=>l[k])),BigInt(l.local_required));assert(BigInt(s.account.amount)>=BigInt(l.local_required));assert(BigInt(l.storage_total)+BigInt(l.operational)>=BigInt(l.storage_stake));assert.equal(sum(Object.values(s.roles).map(r=>r.floor))+BigInt(l.locked),BigInt(l.T));assert.equal(l.inflight,'0');
const t=j.transactions.at(-1),claim=s.claims[t.args.claim_id];assert.equal(claim.state,0);assert.equal(claim.owner,t.signer);const pk=j.preflight.roles.carol.signing_access.public_key;s.carol_access_key=await rpc('query',{request_type:'view_access_key',account_id:t.signer,public_key:pk,block_id:block.hash});
t.status='UNKNOWN_BROADCAST_NOT_LOCATED';t.recovery_evidence=['acceptance-execution/hash-recovery-near.json','acceptance-execution/hash-recovery-drpc.json'];t.after_stop_snapshot=s;t.note='RPC rate-limited broadcast. Two independent RPCs reported UNKNOWN_TRANSACTION. Available claim and unchanged signer nonce at stop do not authorize automatic re-signing/resubmission.';
j.read_interruptions=[{message:'Initial sandbox network access failed before writes'},{message:'Read-only HTTP 429 after first verified transfer'},{message:j.stop_reason.message}];j.stop_reason={at:new Date().toISOString(),message:'Unresolved withdrawal broadcast; stopped all financial execution without re-signing or retry',hash:t.hash};j.status='STOPPED_UNKNOWN_WITHDRAWAL_BROWSER_SIGNING_UNVERIFIED';j.final=s;j.final_snapshot_label='Authoritative finalized state at STOP, not a completed acceptance run';j.financial_execution_stopped=true;
fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n');console.log(JSON.stringify({status:j.status,hash:t.hash,claim,loan:s.loans['15'],ledger:l},null,2));
