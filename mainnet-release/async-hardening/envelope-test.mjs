import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {connect,keyStores,KeyPair,transactions}=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const b=import.meta.dirname,o=process.env.RELEASE_DIR??b+'/runtime/evidence/finalization-20261113',N=10n**24n,v=JSON.parse(fs.readFileSync(b+'/.sandbox/node/validator_key.json'));
const s=new keyStores.InMemoryKeyStore();await s.setKey('sandbox',v.account_id,KeyPair.fromString(v.secret_key));const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:s});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));const root=await near.account(v.account_id),tag=Date.now().toString(36),rows=[];
async function make(label){const tail=label+tag+'.'+root.accountId,id='z'.repeat(64-tail.length)+tail,k=KeyPair.fromRandom('ed25519');await s.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),10n*N);return near.account(id)}
const c=await make('floor'),a=await make('actor'),f=await make('receiver');await c.deployContract(fs.readFileSync(o+'/new-normal.wasm'));await f.deployContract(fs.readFileSync('E:/near-2/target/wasm32-unknown-unknown/release/floorline_receiver_fixture.wasm'));
async function view(m,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:c.accountId,method_name:m,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'final'});return JSON.parse(Buffer.from(r.result))}
async function call(w,m,args={},d=0n){const sent=await w.signAndSendTransaction({receiverId:c.accountId,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),110n*10n**12n,d)],returnError:true});const r=await near.connection.provider.sendJsonRpc('tx',{tx_hash:sent.transaction.hash,sender_account_id:w.accountId,wait_until:'FINAL'});rows.push({method:m,args,result:r});assert(!r.status.Failure,JSON.stringify(r.status));assert(!r.receipts_outcome.some(x=>x.outcome.status.Failure),JSON.stringify(r.status));const x=await view('accounting');assert(BigInt(x.account_balance)>=BigInt(x.local_required));assert(BigInt(x.storage_total)+BigInt(x.operational)>=BigInt(x.storage_stake));return r}
const value=r=>JSON.parse(Buffer.from(r.status.SuccessValue,'base64'));
await call(root,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1',...(process.env.SANDBOX_PILOT_LIMITS?{pilot_limits:JSON.parse(process.env.SANDBOX_PILOT_LIMITS)}:{})});
for(const u of [a,f])await call(u,'storage_deposit',{account_id:null,registration_only:false},N);
const minimal=await make('minimal'),minimum=(await view('storage_balance_bounds')).min;
await call(root,'storage_deposit',{account_id:minimal.accountId,registration_only:true},BigInt(minimum)+100n);
assert.deepEqual(await view('storage_balance_of',{account_id:minimal.accountId}),{total:minimum,available:'0'});
assert.equal(await view('storage_balance_of',{account_id:root.accountId}),null);
await call(minimal,'storage_unregister',{force:false},1n);
await call(a,'issue',{min_tokens:'1'},N);
const memo='m'.repeat(256);
// Fixture parses a JSON string, then falls back to its exact msg mode. Use a
// JSON object with whitespace so the supported payload is precisely 1024 bytes.
const payload='{"kind":"accept"}';const padded=payload+' '.repeat(1024-Buffer.byteLength(payload));
await call(a,'ft_transfer_call',{receiver_id:f.accountId,amount:'1',memo,msg:padded},1n);
const loan=value(await call(a,'fund_offer',{repayment:'110',collateral:'1',duration_ns:'60000000000'},100n));
await call(a,'accept_offer',{loan_id:loan});
await call(a,'nft_transfer_call',{receiver_id:f.accountId,token_id:loan,approval_id:null,memo,msg:padded},1n);
await call(a,'storage_withdraw',{amount:(N/10n).toString()},1n);
fs.writeFileSync(o+'/maximum-envelope-final.json',JSON.stringify({passed:true,gas:'110000000000000',account_length:64,memo_bytes:256,msg_bytes:1024,rows},null,2));console.log('PASS 110 Tgas: maximum account/memo/msg FT and NFT resolver envelopes and sponsored minimum registration');
