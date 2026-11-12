// Public read-only NEAR RPC audit. No wallet import, credentials, or signing.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const evidence=JSON.parse(fs.readFileSync('frontend/src/data/evidence.json'));
const endpoint='https://test.rpc.fastnear.com',contract=evidence.contract,dao=evidence.dao;
const out={scope:'CURRENT PUBLIC TESTNET READS ONLY; no new transactions or signing',checked_at:new Date().toISOString(),endpoint,transactions_submitted:0,private_key_access:false,errors:[],historical_transactions:[]};
async function rpc(method,params){const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'product-completion-readonly',method,params}),signal:AbortSignal.timeout(20000)});assert(response.ok,`HTTP ${response.status}`);const d=await response.json();assert(!d.error,JSON.stringify(d.error));return d.result;}
try {
 out.status=await rpc('status',[]);assert.equal(out.status.chain_id,'testnet');const block=await rpc('block',{finality:'final'});out.block=block.header;
 const query=(account_id,request_type)=>rpc('query',{request_type,account_id,block_id:block.header.hash});
 const view=async(account_id,method_name,args={})=>{const v=await rpc('query',{request_type:'call_function',account_id,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),block_id:block.header.hash});return JSON.parse(Buffer.from(v.result).toString());};
 out.floor={account:await query(contract,'view_account'),public_access_keys:await query(contract,'view_access_key_list'),ledger:await view(contract,'accounting'),metadata:await view(contract,'ft_metadata'),storage_bounds:await view(contract,'storage_balance_bounds')};
 assert.equal(out.floor.account.code_hash,'6ZMSujAT2DTyxVNkGBqh4pcg8roYzNDeM8hHxXTXhgv9');
 const l=out.floor.ledger,p=['L','unused_lender','borrower_claims','lender_claims','redemption_claims','cancellation_claims','storage_refund_claims','storage_total','operational'].reduce((sum,k)=>sum+BigInt(l[k]),0n);
 assert.equal(p,BigInt(l.local_required));assert(BigInt(out.floor.account.amount)>=p);assert(BigInt(l.storage_total)+BigInt(l.operational)>=BigInt(l.storage_stake));
 const L=BigInt(l.L),T=BigInt(l.T),c=10n**23n,tax=BigInt(l.tax_bps);
 out.floor.issuance_1_to_1_eligible=T===0n||T>=L;
 out.floor.exact_backing={numerator:l.L,denominator:l.T};
 if(T>=c){const q=L*c*((10000n-tax)*T+tax*c)/(10000n*T*T);const actual=await view(contract,'quote',{amount:c.toString()});assert.equal(q.toString(),actual);out.floor.redemption={amount:c.toString(),local_quote:q.toString(),contract_quote:actual};}
 out.dao={account:await query(dao,'view_account'),public_access_keys:await query(dao,'view_access_key_list'),policy:await view(dao,'get_policy'),last_proposal_id:await view(dao,'get_last_proposal_id'),proposal_zero:await view(dao,'get_proposal',{id:0})};
 assert.equal(out.dao.account.code_hash,'AA4nA45vauiac3jdVwJTzSdUP3oj2r1fDaPAb2mHdgcH');
 out.floor.loans={};out.floor.claims={};out.floor.nfts={};
 for(const id of evidence.loanIds){out.floor.loans[id]=await view(contract,'get_loan',{loan_id:id});out.floor.nfts[id]=await view(contract,'nft_token',{token_id:id});}
 for(const id of evidence.claimIds)out.floor.claims[id]=await view(contract,'get_claim',{claim_id:id});
 out.roles={};for(const actor of new Set([...evidence.events.map(e=>e.signer),...evidence.council])){
   try{out.roles[actor]={native:await query(actor,'view_account'),floor:await view(contract,'ft_balance_of',{account_id:actor}),storage:await view(contract,'storage_balance_of',{account_id:actor})};}catch(e){out.roles[actor]={error:e.message};}
 }
 for(const event of evidence.events){try{const r=await rpc('tx',{tx_hash:event.tx,sender_account_id:event.signer,wait_until:'FINAL'});assert.equal(r.transaction.hash,event.tx);assert.equal(r.transaction.signer_id,event.signer);assert.equal(r.transaction.receiver_id,event.receiver);assert.equal(r.final_execution_status,'FINAL');assert(!r.status.Failure);assert(r.receipts_outcome.every(r=>!r.outcome.status.Failure));out.historical_transactions.push({id:event.id,hash:event.tx,signer:event.signer,receiver:event.receiver,result:'VERIFIED FINAL SUCCESS',explorer:`https://testnet.nearblocks.io/txns/${event.tx}`,raw:r});}catch(e){out.historical_transactions.push({id:event.id,hash:event.tx,result:'CURRENT RECHECK UNAVAILABLE',error:e.message});}}
 out.approved_wasm_sha256=createHash('sha256').update(fs.readFileSync('runtime/artifacts/floorline.wasm')).digest('hex');assert.equal(out.approved_wasm_sha256,'529423c2a8d7c8282af893b189e7b423fbfcc88373f5483ef70f1f62e57945e6');
 out.result='READ-ONLY CHECKS PASSED; frontend live-signature acceptance remains unverified';
}catch(e){out.result='BLOCKED';out.errors.push(e.stack);process.exitCode=1;}
fs.writeFileSync('product-review/LIVE_TESTNET_READS.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({result:out.result,errors:out.errors,verified_historical_transactions:out.historical_transactions.filter(t=>t.result==='VERIFIED FINAL SUCCESS').length,ledger:out.floor?.ledger},null,2));
