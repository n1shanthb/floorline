import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const api=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const {connect,keyStores,KeyPair,transactions}=api;
const base='E:/near-2-mainnet-review/mainnet-release/v3';
const key=JSON.parse(fs.readFileSync('E:/near-2-mainnet-review/v2/.sandbox/node/validator_key.json'));
const store=new keyStores.InMemoryKeyStore();
await store.setKey('sandbox',key.account_id,KeyPair.fromString(key.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:store});
assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(key.account_id),N=10n**24n,journal=[];
async function make(label){const id=label+Date.now()+'.'+root.accountId,k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),30n*N);return near.account(id)}
async function call(a,c,m,args={},deposit=0n){const r=await a.signAndSendTransaction({receiverId:c.accountId,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),300n*10n**12n,deposit)],returnError:true});journal.push({method:m,result:r});return r}
async function view(c,m,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:c.accountId,method_name:m,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(r.result))}
function value(r){return JSON.parse(Buffer.from(r.status.SuccessValue,'base64'))}
function failed(r){return !!r.status.Failure||r.receipts_outcome.some(x=>x.outcome.status.Failure)}
const c=await make('v3'),a=await make('user');
await c.deployContract(fs.readFileSync(base+'/artifacts/normal.wasm'));
assert(!failed(await call(root,c,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'})));
await call(a,c,'storage_deposit',{account_id:null,registration_only:false},N);
assert(!failed(await call(a,c,'issue',{min_tokens:'1'},N)));
assert(failed(await call(root,c,'issue',{min_tokens:'1'},101n*N)));
const claim=value(await call(a,c,'redeem',{amount:(N/10n).toString(),min_out:'1'}));
assert(failed(await call(a,c,'stop_new_risk')));
assert(!failed(await call(root,c,'stop_new_risk')));
assert(failed(await call(a,c,'issue',{min_tokens:'1'},N)));
assert(!failed(await call(a,c,'withdraw_claim',{claim_id:claim})));
assert.equal((await view(c,'get_claim',{claim_id:claim})).state,3);
assert(failed(await call(a,c,'withdraw_claim',{claim_id:claim})));
assert(failed(await call(a,c,'finalize_unknown_claim_as_paid',{claim_id:claim})));
const accounting=await view(c,'accounting');assert(BigInt(accounting.account_balance)>=BigInt(accounting.local_required));
fs.writeFileSync(base+'/sandbox-results.json',JSON.stringify({network:'LOCAL_SANDBOX_ONLY',checks_passed:9,accounting,controls:await view(c,'release_controls'),journal},null,2));
console.log('PASS: 9 v3 runtime checks');
