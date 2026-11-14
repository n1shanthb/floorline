import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {connect,keyStores,KeyPair,transactions}=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const b=import.meta.dirname,o=b+'/runtime/evidence/release-rc1',N=10n**24n,v=JSON.parse(fs.readFileSync(b+'/.sandbox/node/validator_key.json'));
const s=new keyStores.InMemoryKeyStore();await s.setKey('sandbox',v.account_id,KeyPair.fromString(v.secret_key));const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:s});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));const root=await near.account(v.account_id),rows=[];
async function make(label){const id=label+Date.now()+'.'+root.accountId,k=KeyPair.fromRandom('ed25519');await s.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),10n*N);return near.account(id)}
let c;
async function view(m,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:c.accountId,method_name:m,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'final'});return JSON.parse(Buffer.from(r.result))}
async function call(a,m,args={},d=0n,fail=false){const sent=await a.signAndSendTransaction({receiverId:c.accountId,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),110n*10n**12n,d)],returnError:true});const r=await near.connection.provider.sendJsonRpc('tx',{tx_hash:sent.transaction.hash,sender_account_id:a.accountId,wait_until:'FINAL'});assert.equal(!!r.status.Failure,fail,JSON.stringify(r.status));const ledger=await view('accounting');assert(BigInt(ledger.account_balance)>=BigInt(ledger.local_required));assert(BigInt(ledger.storage_total)+BigInt(ledger.operational)>=BigInt(ledger.storage_stake));rows.push({method:m,args,deposit:d.toString(),expected_failure:fail,result:r,ledger});return r}
const value=r=>JSON.parse(Buffer.from(r.status.SuccessValue,'base64'));
c=await make('disabled');await c.deployContract(fs.readFileSync(o+'/new-normal.wasm'));await call(root,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});await call(root,'issue',{min_tokens:'1'},1n,true);await call(root,'storage_deposit',{account_id:null,registration_only:false},N,true);assert.equal((await view('pilot_status')).limits.max_gross,'0');
c=await make('limited');await c.deployContract(fs.readFileSync(o+'/new-normal.wasm'));
await call(root,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1',pilot_limits:{max_action:'1000',max_gross:'3000',max_storage:N.toString()}});
const a=await make('borrower'),dave=await make('nftowner'),l=await make('lender'),empty=await make('empty');
for(const u of [a,dave,l,empty])await call(u,'storage_deposit',{account_id:null,registration_only:false},N);
await call(a,'storage_deposit',{account_id:null,registration_only:false},1n,true);
await call(a,'issue',{min_tokens:'1'},1001n,true);await call(a,'issue',{min_tokens:'1'},1000n);await call(a,'issue',{min_tokens:'1'},1000n);
const repayLoan=value(await call(l,'fund_offer',{repayment:'110',collateral:'10',duration_ns:'3600000000000'},100n));
const defLoan=value(await call(l,'fund_offer',{repayment:'110',collateral:'10',duration_ns:'1'},100n));
const open=value(await call(l,'fund_offer',{repayment:'800',collateral:'10',duration_ns:'3600000000000'},800n));
assert.equal((await view('pilot_status')).gross,'3000');
await call(a,'contribute',{},1n,true);await call(a,'issue',{min_tokens:'1'},1n,true);assert.equal((await view('pilot_status')).gross,'3000');
const principal=value(await call(a,'accept_offer',{loan_id:repayLoan}));await call(a,'accept_offer',{loan_id:defLoan});await call(a,'nft_transfer',{receiver_id:dave.accountId,token_id:repayLoan,approval_id:null,memo:null},1n);
await call(a,'stop_new_risk',{},0n,true);await call(root,'stop_new_risk');
for(const m of ['issue','contribute'])await call(a,m,m==='issue'?{min_tokens:'1'}:{},1n,true);
await call(l,'fund_offer',{repayment:'1',collateral:'1',duration_ns:'1'},1n,true);await call(a,'accept_offer',{loan_id:open},0n,true);
await call(a,'withdraw_claim',{claim_id:principal});
await call(dave,'repay',{loan_id:repayLoan},110n);await call(a,'default_loan',{loan_id:defLoan});
const cancel=value(await call(l,'cancel_offer',{loan_id:open}));await call(l,'withdraw_claim',{claim_id:cancel});
const redemption=value(await call(a,'redeem',{amount:'100',min_out:'1'}));await call(a,'withdraw_claim',{claim_id:redemption});
await call(a,'storage_withdraw',{amount:(N/10n).toString()},1n);await call(empty,'storage_unregister',{force:false},1n);
assert.equal((await view('pilot_status')).gross,'3000');assert.equal((await view('pilot_status')).stopped,true);
fs.writeFileSync(o+'/controls.json',JSON.stringify({passed:true,limits_are_sandbox_fixtures:true,rows,final:await view('accounting'),status:await view('pilot_status')},null,2));console.log('PASS disabled defaults, action/gross/storage boundaries, irreversible stop and loan/default/redemption/storage exits');
