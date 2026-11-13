import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {connect,keyStores,KeyPair,transactions}=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const base=import.meta.dirname,N=10n**24n;
const vk=JSON.parse(fs.readFileSync(base+'/.sandbox/node/validator_key.json'));
const store=new keyStores.InMemoryKeyStore();await store.setKey('sandbox',vk.account_id,KeyPair.fromString(vk.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:store});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(vk.account_id);
const id='gas'+Date.now()+'.'+root.accountId,k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),20n*N);const c=await near.account(id);await c.deployContract(fs.readFileSync(base+'/runtime/artifacts/floorline.wasm'));
const rows=[];
async function call(m,args={},d=0n,gas=110n*10n**12n){const r=await root.signAndSendTransaction({receiverId:id,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),gas,d)],returnError:true});rows.push({method:m,gas:gas.toString(),result:r});return r}
function failure(r){return !!r.status.Failure||r.receipts_outcome.some(x=>x.outcome.status.Failure)}
await call('new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});
assert(failure(await call('storage_deposit',{account_id:null,registration_only:false},N,109n*10n**12n)));
for(let i=0;i<3;i++){
 assert(!failure(await call('storage_deposit',{account_id:null,registration_only:false},N)));
 assert(!failure(await call('storage_withdraw',{amount:(N/10n).toString()},1n)));
 assert(!failure(await call('storage_unregister',{force:false},1n)));
}
fs.writeFileSync(base+'/runtime/evidence/gas-boundary.json',JSON.stringify({network:'LOCAL_SANDBOX_ONLY',rounds:3,preflight_rejected:true,rows},null,2));console.log('PASS storage boundary and 3 complete registration/refund/unregistration cycles');
