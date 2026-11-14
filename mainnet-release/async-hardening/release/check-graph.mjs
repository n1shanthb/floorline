// Offline acceptance state/rights model; this is a proof check, not chain evidence.
import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';
const dir=import.meta.dirname,out=dir+'/preflight-20261114',p=JSON.parse(fs.readFileSync(dir+'/acceptance-plan.json')),N=10n**24n;
const tokens={holder:0n,borrower:0n,nft_holder:0n,lender:0n},loans=new Map(),claims=new Map();let T=0n,L=0n,gross=0n,stopped=false;const trace=[];
const ref=x=>x.$result;const paid=id=>{const c=claims.get(id);assert(c?.paid);claims.delete(id)};
for(const s of p.steps){const a=s.args,d=BigInt(s.deposit);switch(s.method){
case 'issue':assert(!stopped);T+=d;L+=d;tokens[s.signer_role]+=d;gross+=d;break;
case 'contribute':assert(!stopped&&T>0n);L+=d;gross+=d;break;
case 'ft_transfer':{const n=BigInt(a.amount),to=a.receiver_id.$account;assert(tokens[s.signer_role]>=n);tokens[s.signer_role]-=n;tokens[to]+=n;break;}
case 'redeem':{const c=BigInt(a.amount);assert(tokens[s.signer_role]>=c);const base=L*c/T,q=base*(8000n*T+2000n*c)/(10000n*T);assert(q>0n);tokens[s.signer_role]-=c;L-=q;T-=c;claims.set(s.id,{owner:s.signer_role,paid:false,amount:q});break;}
case 'fund_offer':assert(!stopped);loans.set(s.id,{owner:null,lender:s.signer_role,state:'offered',collateral:BigInt(a.collateral),principal:d,repayment:BigInt(a.repayment)});gross+=d;break;
case 'accept_offer':{assert(!stopped);const l=loans.get(ref(a.loan_id));assert(l.state==='offered');assert(tokens[s.signer_role]>=l.collateral);tokens[s.signer_role]-=l.collateral;l.owner=s.signer_role;l.state='active';claims.set(s.id,{owner:s.signer_role,paid:false,amount:l.principal});break;}
case 'nft_transfer':{const l=loans.get(ref(a.token_id));assert(l.state==='active'&&l.owner===s.signer_role);l.owner=a.receiver_id.$account;break;}
case 'repay':{const l=loans.get(ref(a.loan_id));assert(l.state==='active'&&l.owner===s.signer_role&&l.repayment===d);tokens[l.owner]+=l.collateral;l.state='repaid';claims.set(s.id,{owner:l.lender,paid:false,amount:d});break;}
case 'default_loan':{const l=loans.get(ref(a.loan_id));assert(l.state==='active');assert(s.not_before);tokens[l.lender]+=l.collateral;l.state='defaulted';break;}
case 'cancel_offer':{const l=loans.get(ref(a.loan_id));assert(l.state==='offered'&&l.lender===s.signer_role);l.state='cancelled';claims.set(s.id,{owner:l.lender,paid:false,amount:l.principal});break;}
case 'withdraw_claim':{const c=claims.get(ref(a.claim_id));assert(c&&!c.paid&&c.owner===s.signer_role);c.paid=true;break;}
case 'cleanup_claim':paid(ref(a.claim_id));break;
case 'cleanup_loan':{const id=ref(a.loan_id),l=loans.get(id);assert(['repaid','defaulted','cancelled'].includes(l.state));loans.delete(id);break;}
case 'storage_unregister':assert(tokens[s.signer_role]===0n);assert(![...loans.values()].some(l=>l.owner===s.signer_role||l.lender===s.signer_role));assert(![...claims.values()].some(c=>c.owner===s.signer_role));break;
case 'stop_new_risk':stopped=true;assert.equal(s,p.steps.at(-1));break;
}
const locked=[...loans.values()].filter(l=>l.state==='active').reduce((n,l)=>n+l.collateral,0n);assert.equal(Object.values(tokens).reduce((n,v)=>n+v,0n)+locked,T);assert(gross<=N/20n);trace.push({id:s.id,L:L.toString(),T:T.toString(),gross:gross.toString(),tokens:Object.fromEntries(Object.entries(tokens).map(([k,v])=>[k,v.toString()])),locked:locked.toString()});}
assert.equal(loans.size,0);assert.equal(claims.size,0);assert(stopped);assert.equal(gross,16n*N/1000n);
fs.writeFileSync(out+'/graph-model.json',JSON.stringify({passed:true,scope:'OFFLINE_SYMBOLIC_MODEL_NOT_CHAIN_RESULTS; IDs remain symbolic; expiry requires finalized chain-time check; storage/gas proven separately',transactions:39,trace},null,2));console.log('PASS receipt dependency, collateral rights, exact repayment, cleanup, token conservation and stop-last model');const rpc=JSON.parse(fs.readFileSync(out+'/rpc.json')),budget=JSON.parse(fs.readFileSync(out+'/budget.json')),m=JSON.parse(fs.readFileSync(dir+'/testnet-manifest.json'));
const tc=rpc.protocol.result.runtime_config.transaction_costs,ac=tc.action_creation_config,price=BigInt(budget.minimum_purchase_price)>BigInt(budget.spot_gas_price)?BigInt(budget.minimum_purchase_price):BigInt(budget.spot_gas_price),byte=BigInt(budget.byte_price);
const fee=x=>BigInt(x.execution)+BigInt(x.send_not_sir)>BigInt(x.execution)+BigInt(x.send_sir)?BigInt(x.execution)+BigInt(x.send_not_sir):BigInt(x.execution)+BigInt(x.send_sir);
const init=m.atomic_creation_deployment.actions.at(-1),fcbytes=x=>BigInt(Buffer.byteLength(x.method_name)+Buffer.byteLength(JSON.stringify(x.args)));
const receipt=fee(tc.action_receipt_creation_config),fc=x=>fee(ac.function_call_cost)+fcbytes(x)*fee(ac.function_call_cost_per_byte);
const atomicGas=receipt+fee(ac.create_account_cost)+fee(ac.transfer_cost)+fee(ac.add_key_cost.full_access_cost)+fee(ac.deploy_contract_cost)+453798n*fee(ac.deploy_contract_cost_per_byte)+fc(init)+110000000000000n;
const fundingGas=4n*(receipt+fee(ac.transfer_cost)),stopGas=receipt+fc({method_name:'stop_new_risk',args:{}})+110000000000000n;
const controllerGas=(atomicGas+fundingGas+stopGas)*price;assert(controllerGas<=750000000000000000000000n);
const account=rpc.accounts.controller.state.result,stake=BigInt(account.storage_usage)*byte,spendable=BigInt(account.amount)-stake;
budget.controller_detail={atomic_prepaid_and_action_gas:atomicGas.toString(),four_funding_action_gas:fundingGas.toString(),stop_prepaid_and_action_gas:stopGas.toString(),upper_gas_reservation:controllerGas.toString(),allocated_contingency:'750000000000000000000000',current_amount:account.amount,current_storage_stake:stake.toString(),current_spendable:spendable.toString(),funding_ready:spendable>=BigInt(budget.required_ceiling),additional_controller_funding_for_full_proposed_allocations:(BigInt(budget.required_ceiling)>spendable?BigInt(budget.required_ceiling)-spendable:0n).toString(),note:'Conservative quoted action fees plus full prepaid gas. Existing actor balances are retained; planned allocations are additional. No funding request or transfer executed.'};
fs.writeFileSync(out+'/budget.json',JSON.stringify(budget,null,2));const reg=JSON.parse(fs.readFileSync(out+'/registration-review.json')),min=BigInt(reg.frozen_sandbox_minimum),credit=BigInt(reg.proposed_credit),recordUpper=512n*byte;
// One maximum bounded loan precedes cancellation's claim; cleanup prevents overlap
// with the next offer. This is deliberately above the serialized loan/claim sizes.
assert(credit-min-recordUpper>=N/100n,'UI headroom before cancellation');assert(credit-min-2n*recordUpper>=0n,'Loan plus cancellation claim exceeds storage credit');
console.log('PASS conservative per-user storage and UI record headroom after sequential cleanup');