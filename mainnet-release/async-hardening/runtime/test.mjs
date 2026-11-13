import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import nearAPI from 'near-api-js';
import {createHash} from 'node:crypto';
const {connect,keyStores,KeyPair,transactions}=nearAPI;
const print=console.log.bind(console);
console.log=(...args)=>{if(typeof args[0]==='string'&&(args[0].startsWith('PASS')||args[0].startsWith('{')))print(...args);};
console.warn=(...args)=>{if(!String(args[0]).startsWith('Retrying transaction'))print(...args);};
const ROOT=path.resolve(import.meta.dirname,'..');
const N=10n**24n,GAS=300n*10n**12n;
const evidence=[];let tests=0,failed=[];
const store=new keyStores.InMemoryKeyStore();
const vk=JSON.parse(fs.readFileSync(path.join(ROOT,'.sandbox/node/validator_key.json')));
await store.setKey('sandbox',vk.account_id,KeyPair.fromString(vk.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:process.env.SANDBOX_RPC??'http://127.0.0.1:3031',keyStore:store});
assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.SANDBOX_RPC??'http://127.0.0.1:3031').hostname),'local RPC only');
assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'),'sandbox chain only');
const root=await near.account(vk.account_id);
const runTag=Date.now().toString(36);const keys={};
async function account(label,balance=200n*N){const id=`${label}${runTag}.${root.accountId}`;const k=KeyPair.fromRandom('ed25519');keys[id]=k.toString();await store.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),balance);return near.account(id);}
async function view(a,method,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:a.accountId??a,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(r.result).toString());}
async function state(a){return near.connection.provider.query({request_type:'view_account',account_id:a.accountId??a,finality:'optimistic'});}
function result(r){return r.status.SuccessValue?JSON.parse(Buffer.from(r.status.SuccessValue,'base64').toString()):null;}
function failures(r){return [r.transaction_outcome,...r.receipts_outcome].filter(x=>x.outcome.status.Failure).map(x=>({id:x.id,...x.outcome.status}));}
async function tx(a,to,method,args={},deposit=0n,gas=GAS){return a.signAndSendTransaction({receiverId:to.accountId??to,actions:[transactions.functionCall(method,Buffer.from(JSON.stringify(args)),gas,deposit)],returnError:true});}
let floor;
async function measure(name,a,to,method,args={},deposit=0n,expectedFailure=false){const before=await state(floor);const ledgerBefore=await view(floor,'accounting');const r=await tx(a,to,method,args,deposit);const after=await state(floor);const ledger=await view(floor,'accounting');
 const f=failures(r);assert.equal(Boolean(r.status.Failure),expectedFailure,`${name}: ${JSON.stringify(r.status)}`);
 assert(BigInt(after.amount)>=BigInt(ledger.local_required),`${name}: locally unfunded liabilities`);assert(BigInt(ledger.storage_total)+BigInt(ledger.operational)>=BigInt(ledger.storage_stake),`${name}: unfunded storage`);
 const gasUsed=[r.transaction_outcome,...r.receipts_outcome].reduce((a,x)=>a+BigInt(x.outcome.gas_burnt),0n);
 const balances=Object.fromEntries(await Promise.all(Object.keys(keys).map(async id=>[id,await view(floor,'ft_balance_of',{account_id:id})])));
 const relatedLoan=args.loan_id??args.token_id;const loan=relatedLoan!==undefined?await view(floor,'get_loan',{loan_id:relatedLoan}):null;
 let timestamp=null;if(['repay','default_loan'].includes(method)){const exec=r.receipts_outcome.find(x=>x.outcome.executor_id===floor.accountId);if(exec){const block=await near.connection.provider.block({blockId:exec.block_hash});timestamp=block.header.timestamp_nanosec;if(!expectedFailure){if(method==='repay')assert(BigInt(timestamp)<BigInt(loan.expiry));else assert(BigInt(timestamp)>=BigInt(loan.expiry));}}}
 evidence.push({name,method,args,expected_failure:expectedFailure,final_status:r.status,execution_timestamp_ns:timestamp,transaction_hash:r.transaction.hash,receipt_failures:f,gas_total:gasUsed.toString(),receipts:r.receipts_outcome.map(x=>({id:x.id,block_hash:x.block_hash,executor:x.outcome.executor_id,gas:x.outcome.gas_burnt,status:x.outcome.status,logs:x.outcome.logs})),before:{account:before,ledger:ledgerBefore},after:{account:after,ledger,token_balances:balances,related_loan:loan},storage_delta:after.storage_usage-before.storage_usage});return {r,value:result(r),ledger,storage_delta:after.storage_usage-before.storage_usage};}
async function test(name,fn){try{await fn();tests++;console.log(`PASS ${name}`);}catch(e){failed.push({name,error:e.stack});console.error(`FAIL ${name}: ${e.stack}`);throw e;}finally{save();}}
function save(){fs.mkdirSync(path.join(ROOT,'runtime/evidence'),{recursive:true});const wasm=fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline.wasm'));fs.writeFileSync(path.join(ROOT,'runtime/evidence/runtime.json'),JSON.stringify({network:'LOCAL_SANDBOX_ONLY',sandbox:'2.14.0',production_wasm_sha256:createHash('sha256').update(wasm).digest('hex'),runTag,tests,failed,accounts:keys?Object.keys(keys):[],evidence},null,2));}
const alice=await account('alice'),bob=await account('bob'),carol=await account('carol'),dave=await account('dave'),lender=await account('lender'),dao=await account('dao');
floor=await account('floor',20n*N);await floor.deployContract(fs.readFileSync(path.join(ROOT,'runtime/artifacts/floorline.wasm')));
let init=await tx(root,floor,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});assert(!init.status.Failure,JSON.stringify(init.status));
const actors=[alice,bob,carol,dave,lender,dao];
for(const a of actors)await measure('register_'+a.accountId,a,floor,'storage_deposit',{account_id:null,registration_only:false},N);
const expected=JSON.parse(fs.readFileSync(path.join(ROOT,'runtime/evidence/reference.json')));
async function checkpoint(name){const e=expected.find(x=>x.name===name);assert(e);const actual=await view(floor,'accounting');for(const k of ['L','T','locked','unused_lender','borrower_claims','lender_claims','redemption_claims'])assert.equal(actual[k],e[k],`reference ${name}.${k}`);for(let i=0;i<actors.length;i++)assert.equal(await view(floor,'ft_balance_of',{account_id:actors[i].accountId}),e.balances[i],`reference ${name}.balance${i}`);}
let loan,claim;
await test('A: native issuance matches reference',async()=>{await measure('issue',alice,floor,'issue',{min_tokens:'0'},100n*N);await checkpoint('issue');});
await test('FT transfers and locked-supply setup',async()=>{await measure('ft_carol',alice,floor,'ft_transfer',{receiver_id:carol.accountId,amount:(10n*N).toString(),memo:null},1n);await checkpoint('ft_carol');await measure('ft_bob',alice,floor,'ft_transfer',{receiver_id:bob.accountId,amount:(10n*N).toString(),memo:null},1n);await checkpoint('ft_bob');});
await test('B: redemption and actual native payout',async()=>{let x=await measure('redeem',bob,floor,'redeem',{amount:N.toString(),min_out:'1'});claim=x.value;await checkpoint('redeem');const c=await view(floor,'get_claim',{claim_id:claim});const bal=BigInt((await state(bob)).amount);x=await measure('withdraw_redemption',bob,floor,'withdraw_claim',{claim_id:claim});assert.equal((await view(floor,'get_claim',{claim_id:claim})).state,3);assert(BigInt((await state(bob)).amount)>bal+BigInt(c.amount)-10n**22n);await checkpoint('withdraw_redemption');await measure('duplicate_withdraw',bob,floor,'withdraw_claim',{claim_id:claim},0n,true);});
await test('D: lender funding is not backing',async()=>{let x=await measure('fund',lender,floor,'fund_offer',{repayment:(11n*N/10n).toString(),collateral:(2n*N).toString(),duration_ns:'3600000000000'},N);loan=x.value;await checkpoint('fund');});
await test('E: Carol locks FLOOR, receives funded claim and NFT',async()=>{let x=await measure('accept',carol,floor,'accept_offer',{loan_id:loan});claim=x.value;await checkpoint('accept');assert.equal((await view(floor,'nft_token',{token_id:loan})).owner_id,carol.accountId);await measure('withdraw_borrower',carol,floor,'withdraw_claim',{claim_id:claim});await checkpoint('withdraw_borrower');await measure('double_accept',carol,floor,'accept_offer',{loan_id:loan},0n,true);});
await test('F/G: actual NFT transfer then Dave repays',async()=>{await measure('nft_transfer',carol,floor,'nft_transfer',{receiver_id:dave.accountId,token_id:loan,approval_id:null,memo:null},1n);await checkpoint('nft_transfer');await measure('old_owner_repay',carol,floor,'repay',{loan_id:loan},11n*N/10n,true);let x=await measure('repay',dave,floor,'repay',{loan_id:loan},11n*N/10n);claim=x.value;await checkpoint('repay');assert.equal(await view(floor,'nft_token',{token_id:loan}),null);await measure('withdraw_lender',lender,floor,'withdraw_claim',{claim_id:claim});await checkpoint('withdraw_lender');await measure('double_repay',dave,floor,'repay',{loan_id:loan},11n*N/10n,true);await measure('default_after_repay',bob,floor,'default_loan',{loan_id:loan},0n,true);});
await test('H: separate default credits lender once',async()=>{let x=await measure('fund_default',lender,floor,'fund_offer',{repayment:(55n*N/100n).toString(),collateral:N.toString(),duration_ns:'1000000000'},N/2n);loan=x.value;await checkpoint('fund_default');await measure('accept_default',carol,floor,'accept_offer',{loan_id:loan});await checkpoint('accept_default');await new Promise(r=>setTimeout(r,1600));await measure('default',bob,floor,'default_loan',{loan_id:loan});await checkpoint('default');await measure('repay_after_default',carol,floor,'repay',{loan_id:loan},55n*N/100n,true);await measure('double_default',bob,floor,'default_loan',{loan_id:loan},0n,true);});
await test('I: DAO-style contract contribution changes real backing',async()=>{await dao.deployContract(fs.readFileSync(path.join(ROOT,'target/wasm32-unknown-unknown/release/floorline_receiver_fixture.wasm')));await measure('donate',alice,dao,'act',{target:floor.accountId,method:'contribute',args:{},deposit:(N/10n).toString()});await checkpoint('donate');});
await test('C: dilutive issuance rejected; unexpected deposits rejected',async()=>{await measure('dilutive',alice,floor,'issue',{min_tokens:'0'},N,true);await measure('unexpected_deposit',alice,floor,'redeem',{amount:N.toString(),min_out:'0'},1n,true);});

// Export helpers for additional receiver, failure and growth scenarios.
export {ROOT,N,GAS,near,root,store,keys,actors,alice,bob,carol,dave,lender,dao,floor,account,view,state,tx,measure,test,result,failures,save,evidence};
await (await import('./receipts.mjs')).run({ROOT,N,GAS,near,root,store,keys,actors,alice,bob,carol,dave,lender,dao,floor,account,view,state,tx,measure,test,result,failures,save,evidence});
save();console.log(JSON.stringify({tests,failed:failed.length,financialReceipts:evidence.length}));

