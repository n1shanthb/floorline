import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {connect,keyStores,KeyPair,transactions}=createRequire('file:///E:/near-2/runtime/package.json')('near-api-js');
const base=import.meta.dirname,out=base+'/runtime/evidence/finalization-20261113',mode=process.argv[2];
assert(['old','new','normal'].includes(mode));
const vk=JSON.parse(fs.readFileSync(base+'/.sandbox/node/validator_key.json'));
const store=new keyStores.InMemoryKeyStore();await store.setKey('sandbox',vk.account_id,KeyPair.fromString(vk.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:'http://127.0.0.1:3032',keyStore:store});assert((await near.connection.provider.status()).chain_id.startsWith('test-chain'));
const root=await near.account(vk.account_id),N=10n**24n,tag=Date.now().toString(36),rows=[];
async function create(label){const tail=label+tag+'.'+root.accountId;const id='a'.repeat(64-tail.length)+tail,k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,k);await root.createAccount(id,k.getPublicKey(),N);return near.account(id)}
const c=await create('c');await root.sendMoney(c.accountId,10n*N);
const artifact=mode==='old'?out+'/artifacts/floorline-fault.wasm':out+(mode==='normal'?'/new-normal.wasm':'/new-fault.wasm');
await c.deployContract(fs.readFileSync(artifact));
async function view(m,args={}){const r=await near.connection.provider.query({request_type:'call_function',account_id:c.accountId,method_name:m,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'final'});return JSON.parse(Buffer.from(r.result))}
async function call(a,m,args={},d=0n){const sent=await a.signAndSendTransaction({receiverId:c.accountId,actions:[transactions.functionCall(m,Buffer.from(JSON.stringify(args)),110n*10n**12n,d)],returnError:true});const r=await near.connection.provider.sendJsonRpc('tx',{tx_hash:sent.transaction.hash,sender_account_id:a.accountId,wait_until:'FINAL'});const ledger=await view('accounting');assert(BigInt(ledger.account_balance)>=BigInt(ledger.local_required));assert(BigInt(ledger.storage_total)+BigInt(ledger.operational)>=BigInt(ledger.storage_stake));const row={method:m,signer:a.accountId,result:r,ledger};rows.push(row);fs.writeFileSync(out+'/'+mode+'-tx-'+tag+'-'+rows.length+'.json',JSON.stringify({mode,contract:c.accountId,...row},null,2));return r}
await call(root,'new',{tax_bps:2000,issuance_numerator:'1',issuance_denominator:'1'});
const count=mode==='old'?64:128;
const users=[];for(let i=0;i<count;i++){const a=await create('u'+i);users.push(a);const r=await call(a,'storage_deposit',{account_id:null,registration_only:false},N/100n);assert(!r.status.Failure);if((i+1)%32===0)console.log(mode+' registered '+(i+1))}
if(mode!=='old'){const r=await call(root,'storage_deposit',{account_id:null,registration_only:false},N/100n);assert(r.status.Failure);assert.equal((await view('admission_status')).occupied,128)}
let accepted=0,threshold=null;
for(let i=0;i<count;i++){
 const a=users[i],r=await call(a,'storage_unregister',{force:false},1n),u=await view('user_state',{account_id:a.accountId});
 if(r.status.Failure){threshold=i;break}
 if(mode==='normal'){assert.equal(u,null);assert(!r.receipts_outcome.some(x=>x.outcome.status.Failure));}
 else {assert.equal(u.refund_state,3);assert.equal(u.refund,(N/100n).toString());assert(r.receipts_outcome.some(x=>x.outcome.status.Failure),'deliberate callback failure required');}
 accepted++;
 if([1,2,9,32,100,128].includes(accepted))console.log(mode+' unknown exits '+accepted);
}
if(mode==='old')assert(threshold!==null,'old failure must reproduce');
else if(mode==='new'){
 assert.equal(accepted,128);assert.equal(threshold,null);
 const before=await view('user_state',{account_id:users[0].accountId});
 const repeat=await call(users[0],'storage_unregister',{force:false},1n);
 assert.equal(JSON.parse(Buffer.from(repeat.status.SuccessValue,'base64')),false);
 assert((await call(users[0],'storage_deposit',{account_id:null,registration_only:false},N/100n)).status.Failure);
 assert.deepEqual(await view('user_state',{account_id:users[0].accountId}),before);
}
else {assert.equal(accepted,128);assert.equal((await view('admission_status')).occupied,0);await call(users[0],'storage_deposit',{account_id:null,registration_only:false},N/100n);await call(users[0],'storage_unregister',{force:false},1n);assert.equal((await view('admission_status')).occupied,0)}
fs.writeFileSync(out+'/'+mode+'-summary.json',JSON.stringify({mode,accepted,threshold,admission:mode!=='old'?await view('admission_status'):null,final:await view('accounting')},null,2));
console.log(JSON.stringify({mode,accepted,threshold}));
