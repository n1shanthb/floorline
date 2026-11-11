// Local-only integration runner. Fresh sandbox credentials only; never reads
// Floorline's credentials or original sandbox state. Raw receipts contain NO keys.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.resolve(ROOT,'../../runtime/package.json'));
const {connect,keyStores,KeyPair,transactions}=require('near-api-js');
const RPC='http://127.0.0.1:3032';
const N=10n**24n, GAS=300n*10n**12n, MAX='18446744073709551615';
const evidence=[],tests=[];
const rootKey=JSON.parse(fs.readFileSync(path.join(ROOT,'sandbox-home/node/validator_key.json')));
const store=new keyStores.InMemoryKeyStore();
await store.setKey('sandbox',rootKey.account_id,KeyPair.fromString(rootKey.secret_key));
const near=await connect({networkId:'sandbox',nodeUrl:RPC,keyStore:store});
const chain=(await near.connection.provider.status()).chain_id;
assert(chain.startsWith('test-chain'),'Fresh local sandbox only');
const root=await near.account(rootKey.account_id);
const tag=Date.now().toString(36),ids=[];let serial=0;
fs.mkdirSync(path.join(ROOT,'evidence/history'),{recursive:true});
if(fs.existsSync(path.join(ROOT,'evidence/SANDBOX_RESULTS.json')))fs.copyFileSync(path.join(ROOT,'evidence/SANDBOX_RESULTS.json'),path.join(ROOT,`evidence/history/before-${tag}.json`));
const wasm=fs.readFileSync(path.join(ROOT,'artifacts/floorkit.wasm'));
const fault=fs.readFileSync(path.join(ROOT,'artifacts/floorkit-fault.wasm'));
const fixture=fs.readFileSync(path.join(ROOT,'artifacts/receiver.wasm'));
function save(error=null){const content=JSON.stringify({
    scope:'LOCAL_SANDBOX_ONLY',sandbox_version:'2.14.0',chain_id:chain,
    normal_wasm_sha256:createHash('sha256').update(wasm).digest('hex'),
    fault_wasm_sha256:createHash('sha256').update(fault).digest('hex'),
    test_count:tests.length,tests,error,accounts:ids,evidence},null,2)+'\n';
    for(let attempt=0;;attempt++){try{fs.writeFileSync(path.join(ROOT,'evidence/SANDBOX_RESULTS.json'),content);break;}
        catch(e){if(attempt>=5)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}}
}
async function account(label,balance=100n*N){
    const id=`${label}${serial++}${tag}.${root.accountId}`;
    const k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',id,k);
    await root.createAccount(id,k.getPublicKey(),balance);ids.push(id);return near.account(id);
}
async function recreate(a){const k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',a.accountId,k);
    await root.createAccount(a.accountId,k.getPublicKey(),20n*N);return near.account(a.accountId);}
const id=a=>a.accountId??a;
async function view(a,method,args={}) {const r=await near.connection.provider.query({request_type:'call_function',account_id:id(a),method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'optimistic'});return JSON.parse(Buffer.from(r.result).toString());}
async function state(a) {return near.connection.provider.query({request_type:'view_account',account_id:id(a),finality:'optimistic'});}
async function call(a,to,method,args={},deposit=0n,gas=GAS){a.accessKeyByPublicKeyCache={};return a.signAndSendTransaction({receiverId:id(to),actions:[transactions.functionCall(method,Buffer.from(JSON.stringify(args)),gas,deposit)],returnError:true});}
function value(r){return r.status.SuccessValue?JSON.parse(Buffer.from(r.status.SuccessValue,'base64').toString()):null;}
function isFail(r){return Boolean(r.status.Failure);}
function events(r,name){return r.receipts_outcome.flatMap(x=>x.outcome.logs).filter(x=>x.startsWith('EVENT_JSON:')).map(x=>JSON.parse(x.slice(11))).filter(x=>x.event===name).flatMap(x=>x.data);}
function assertAccounting(a){
    const p=['R','C','F','H','K','O'].reduce((sum,k)=>sum+BigInt(a[k]),0n);
    assert.equal(p,BigInt(a.P));assert(BigInt(a.A)>=p,'A>=P');
    assert(BigInt(a.storage_stake)<=BigInt(a.K)+BigInt(a.O),'storage covered');
    assert.equal(a.closed,BigInt(a.T)===0n);if(a.closed)assert.equal(a.R,'0');
}
async function measure(name,a,f,method,args={},deposit=0n,fail=false,gas=GAS,to=f){
    const before=await view(f,'accounting');const stateBefore=await state(f);
    const r=await call(a,to,method,args,deposit,gas);
    const after=await view(f,'accounting');const stateAfter=await state(f);assertAccounting(after);
    evidence.push({name,method,args,deposit:deposit.toString(),prepaid_gas:gas.toString(),expected_failure:fail,
        before,after,storage_delta:stateAfter.storage_usage-stateBefore.storage_usage,
        gas_burnt:[r.transaction_outcome,...r.receipts_outcome].reduce((sum,x)=>sum+BigInt(x.outcome.gas_burnt),0n).toString(),
        raw:r});save();
    assert.equal(isFail(r),fail,`${name}: ${JSON.stringify(r.status)}`);
    const first=r.receipts_outcome.find(x=>x.outcome.executor_id===f.accountId);
    if(id(to)===id(f) && first?.outcome.status.Failure)for(const k of ['R','T','F','C','H','K','O','I','closed','refund_pool_used'])assert.equal(after[k],before[k],`${name}: rollback ${k}`);
    if(BigInt(before.T)>0n && BigInt(after.T)>0n)assert(BigInt(after.R)*BigInt(before.T)>=BigInt(before.R)*BigInt(after.T),'backing monotonic');
    return r;
}
async function test(name,fn){await fn();tests.push(name);save();console.log(`PASS ${name}`);}
async function deploy(label,artifact=wasm,seed=10n*N,recipient=null,overrides={}){
    const f=await account(label,30n*N);const owner=recipient??await account('owner');
    const config={metadata:{spec:'ft-1.0.0',name:'FloorKit local reference',symbol:'KIT',decimals:24,icon:null,reference:null,reference_hash:null},
        initial_price:N.toString(),markup_bps:500,redemption_tax_bps:2000,creator_fee_bps:100,creator_id:owner.accountId,
        bootstrap_recipient:owner.accountId,seed_reserve:seed.toString(),recipient_storage:N.toString(),operational_reserve:(5n*N).toString(),...overrides};
    const r=await f.signAndSendTransaction({receiverId:f.accountId,actions:[transactions.deployContract(artifact),transactions.functionCall('new',Buffer.from(JSON.stringify(config)),GAS,seed+6n*N)],returnError:true});
    evidence.push({name:`atomic_init_${label}`,config,raw:r});save();assert(!isFail(r),JSON.stringify(r.status));
    evidence.at(-1).account_state=await state(f);evidence.at(-1).access_keys=await near.connection.provider.query({request_type:'view_access_key_list',account_id:f.accountId,finality:'optimistic'});
    assertAccounting(await view(f,'accounting'));return {f,owner,config};
}
const qRedeem=(r,t,c,tax=2000n)=>r*c*((10000n-tax)*t+tax*c)/(10000n*t*t);
const qMint=(r,t,d)=>{const fee=d*100n/10000n;return {tokens:(d-fee)*t*10000n/(r*10500n),fee};};
try {
    const {f,owner:alice,config}=await deploy('coin');const bob=await account('bob');const receiver=await account('receiver',20n*N);await receiver.deployContract(fixture);
    await test('bootstrap and immutable initialization',async()=>{
        const a=await view(f,'accounting');assert.equal(a.R,(10n*N).toString());assert.equal(a.T,(10n*N).toString());
        await measure('reject_reinit',alice,f,'new',config,14n*N,true);
        assert.equal((await view(f,'get_config')).creator_id,alice.accountId);
    });
    await test('NEP145 sponsor registration and empty unregister adapter cases',async()=>{
        await measure('register_bob',alice,f,'storage_deposit',{account_id:bob.accountId,registration_only:false},N);
        await measure('register_receiver',alice,f,'storage_deposit',{account_id:receiver.accountId,registration_only:false},N);
        const absent=await account('absent');assert.equal(value(await measure('unregister_absent',absent,f,'storage_unregister',{force:false},1n)),false);
        await measure('register_insufficient',absent,f,'storage_deposit',{},1n,true);
        const b=await view(f,'storage_balance_of',{account_id:bob.accountId});assert(BigInt(b.available)>0n);
    });
    await test('mint exact after-fee accounting, slippage and deadline rejection',async()=>{
        const before=await view(f,'accounting');const q=qMint(BigInt(before.R),BigInt(before.T),N);
        const r=await measure('mint',alice,f,'mint',{min_tokens:q.tokens.toString(),deadline_ns:MAX},N);assert.equal(value(r),q.tokens.toString());
        const a=await view(f,'accounting');assert.equal(a.F,q.fee.toString());assert.equal(BigInt(a.R),BigInt(before.R)+N-q.fee);
        await measure('mint_slippage',alice,f,'mint',{min_tokens:(2n**128n-1n).toString(),deadline_ns:MAX},N,true);
        await measure('mint_expired',alice,f,'mint',{min_tokens:'0',deadline_ns:'0'},N,true);
        await measure('mint_tiny',alice,f,'mint',{min_tokens:'0',deadline_ns:MAX},1n,true);
        for(const bad of ['01','+1','1e2','-1','340282366920938463463374607431768211456'])await measure(`invalid_amount_${bad}`,alice,f,'redeem',{amount:bad,min_near:'0',deadline_ns:MAX},1n,true);
    });
    let claim;
    await test('redemption replaces backing with funded claim then actual payment',async()=>{
        const a=await view(f,'accounting');const q=qRedeem(BigInt(a.R),BigInt(a.T),N);
        claim=value(await measure('redeem',alice,f,'redeem',{amount:N.toString(),min_near:q.toString(),deadline_ns:MAX},1n));
        assert.equal((await view(f,'get_claim',{claim_id:claim})).amount,q.toString());
        await measure('wrong_claim_owner',bob,f,'withdraw_claim',{claim_id:claim},1n,true);
        const r=await measure('withdraw',alice,f,'withdraw_claim',{claim_id:claim},1n);
        assert(events(r,'claim_result').some(x=>x.state==='paid'));
        assert.equal((await view(f,'get_claim',{claim_id:claim})).state,'paid');
        await measure('duplicate_withdraw',alice,f,'withdraw_claim',{claim_id:claim},1n,true);
        await measure('unknown_retry_paid',alice,f,'retry_failed_claim',{claim_id:claim},1n,true);
        await measure('cleanup',bob,f,'cleanup_claim',{claim_id:claim});assert.equal(await view(f,'get_claim',{claim_id:claim}),null);
    });
    await test('creator earned fees segregated from backing',async()=>{
        const a=await view(f,'accounting');const cid=value(await measure('creator_claim',alice,f,'claim_creator_fees',{amount:a.F},1n));
        await measure('creator_pay',alice,f,'withdraw_claim',{claim_id:cid},1n);const b=await view(f,'accounting');assert.equal(b.R,a.R);assert.equal(b.F,'0');
        await measure('unearned_fee',alice,f,'claim_creator_fees',{amount:'1'},1n,true);
        await measure('creator_cleanup',bob,f,'cleanup_claim',{claim_id:cid});
    });
    await test('contribution grows backing without minting; direct cash stays unassigned',async()=>{
        const a=await view(f,'accounting');await measure('contribution',bob,f,'contribute',{},N/10n);const b=await view(f,'accounting');assert.equal(b.T,a.T);assert.equal(BigInt(b.R),BigInt(a.R)+N/10n);
        const raw=await bob.sendMoney(f.accountId,N/10n);const c=await view(f,'accounting');assert.equal(c.R,b.R);evidence.push({name:'unsolicited_cash',before:b,after:c,raw});save();
    });
    await test('FT transfers, force guard and authentication',async()=>{
        await measure('ft_transfer',alice,f,'ft_transfer',{receiver_id:bob.accountId,amount:N.toString(),memo:null},1n);
        await measure('ft_missing_yocto',alice,f,'ft_transfer',{receiver_id:bob.accountId,amount:'1',memo:null},0n,true);
        await measure('force_cannot_burn',bob,f,'storage_unregister',{force:true},1n,true);
        await measure('private_native',bob,f,'on_native_result',{claim_id:'0',attempt_id:'1'},0n,true);
        await measure('private_ft',bob,f,'ft_resolve_transfer',{call_id:'0'},0n,true);
    });
    for(const kind of ['accept','reject','malformed','oversize','panic','exhaust','forward','redeem'])await test(`actual FT receiver ${kind}`,async()=>{
        const before=BigInt(await view(f,'ft_balance_of',{account_id:receiver.accountId}));
        const r=await measure(`ft_call_${kind}`,alice,f,'ft_transfer_call',{receiver_id:receiver.accountId,amount:(N/10n).toString(),memo:null,msg:JSON.stringify({kind,to:bob.accountId})},1n,false,150n*10n**12n);
        const after=BigInt(await view(f,'ft_balance_of',{account_id:receiver.accountId}));
        if(kind==='accept')assert.equal(after,before+N/10n);
        if(['reject','malformed','oversize','panic','exhaust'].includes(kind))assert.equal(after,before);
        // The forwarded call returns null, hence a full unused request. FT are
        // fungible: the resolver may refund pre-existing receiver tokens too.
        if(kind==='forward') {const refund=before<N/10n?before:N/10n;assert.equal(after,before-refund);assert.equal(value(r),(N/10n-refund).toString());}
    });
    await test('pending FT participants cannot force unregister after forwarding',async()=>{
        const rcv=await account('pendingreceiver',20n*N);await rcv.deployContract(fixture);
        await measure('pending_receiver_register',alice,f,'storage_deposit',{account_id:rcv.accountId,registration_only:false},N);
        const raw=await measure('pending_unregister_guard',alice,f,'ft_transfer_call',{receiver_id:rcv.accountId,amount:'1000',memo:null,msg:JSON.stringify({kind:'forward_unregister',to:bob.accountId})},1n,false,150n*10n**12n);
        assert(raw.receipts_outcome.some(x=>JSON.stringify(x.outcome.status).includes('live rights remain')));
        assert(await view(f,'storage_balance_of',{account_id:rcv.accountId}));assert.equal(value(raw),'1000');
    });
    await test('storage automatic payouts, partial/all, excess and unregister',async()=>{
        let r=await measure('storage_partial',bob,f,'storage_withdraw',{amount:'1000'},1n);let cid=events(r,'claim_dispatched')[0].claim_id;
        assert.equal((await view(f,'get_claim',{claim_id:cid})).state,'paid');await measure('storage_cleanup',alice,f,'cleanup_claim',{claim_id:cid});
        r=await measure('storage_all',bob,f,'storage_withdraw',{amount:null},1n);cid=events(r,'claim_dispatched')[0].claim_id;await measure('storage_all_cleanup',alice,f,'cleanup_claim',{claim_id:cid});
        await measure('claim_storage_shortage',bob,f,'redeem',{amount:'1000',min_near:'0',deadline_ns:MAX},1n,true);
        r=await measure('sponsor_excess',alice,f,'storage_deposit',{account_id:bob.accountId,registration_only:true},1000n);cid=events(r,'claim_dispatched')[0].claim_id;await measure('excess_cleanup',alice,f,'cleanup_claim',{claim_id:cid});
        const empty=await account('empty');const min=BigInt((await view(f,'storage_balance_bounds')).min);
        await measure('empty_register',alice,f,'storage_deposit',{account_id:empty.accountId,registration_only:true},min);
        r=await measure('empty_unregister',empty,f,'storage_unregister',{force:true},1n);assert.equal(value(r),true);assert.equal(await view(f,'storage_balance_of',{account_id:empty.accountId}),null);
    });
    await test('overlapping native withdrawals settle once each',async()=>{
        const cids=[];for(let n=0;n<2;n++)cids.push(value(await measure(`overlap_redeem_${n}`,alice,f,'redeem',{amount:'1000',min_near:'0',deadline_ns:MAX},1n)));
        const before=await view(f,'accounting');alice.accessKeyByPublicKeyCache={};
        const raw=await alice.signAndSendTransaction({receiverId:f.accountId,actions:cids.map(cid=>transactions.functionCall('withdraw_claim',Buffer.from(JSON.stringify({claim_id:cid})),150n*10n**12n,1n)),returnError:true});
        assert(!isFail(raw));const after=await view(f,'accounting');assertAccounting(after);assert.equal(after.I,'0');
        for(const cid of cids)assert.equal((await view(f,'get_claim',{claim_id:cid})).state,'paid');
        evidence.push({name:'overlapping_withdrawals',before,after,raw});save();
    });
    await test('maximum account length is prepaid',async()=>{
        const suffix=`.${root.accountId}`,name=('z'+tag).padEnd(64-suffix.length,'z')+suffix;const k=KeyPair.fromRandom('ed25519');await store.setKey('sandbox',name,k);root.accessKeyByPublicKeyCache={};await root.createAccount(name,k.getPublicKey(),20n*N);ids.push(name);
        const min=(await view(f,'storage_balance_bounds')).min;await measure('max_name_register',alice,f,'storage_deposit',{account_id:name,registration_only:true},BigInt(min));
        assert.equal(name.length,64);assert.equal((await view(f,'storage_balance_of',{account_id:name})).available,'0');
        const maxUser=await near.account(name);await measure('max_name_topup',alice,f,'storage_deposit',{account_id:name,registration_only:false},N);
        await measure('max_name_tokens',alice,f,'ft_transfer',{receiver_id:name,amount:'1000',memo:null},1n);
        const cid=value(await measure('max_name_redeem',maxUser,f,'redeem',{amount:'1000',min_near:'0',deadline_ns:MAX},1n,false,40n*10n**12n));
        await measure('max_name_payout',maxUser,f,'withdraw_claim',{claim_id:cid},1n,false,150n*10n**12n);
    });
    await test('randomized executed WASM economic sequences',async()=>{
        const x=await deploy('differential');let s=0x464c4f4fn;
        const next=()=>{s=(s*6364136223846793005n+1442695040888963407n)&((1n<<64n)-1n);return s;};
        for(let step=0;step<64;step++){
            const pick=Number(next()%3n),amount=(next()%10000n)+1000n;
            if(pick===0){const expiry=step%11===0?'0':MAX;await measure(`random_${step}`,x.owner,x.f,'mint',{min_tokens:'0',deadline_ns:expiry},amount,expiry==='0');}
            else if(pick===1){const expiry=step%11===0?'0':MAX;await measure(`random_${step}`,x.owner,x.f,'redeem',{amount:amount.toString(),min_near:'0',deadline_ns:expiry},1n,expiry==='0');}
            else await measure(`random_${step}`,x.owner,x.f,'contribute',{},amount);
        }
        for(let step=0;step<48;step++)await measure(`history_${step}`,x.owner,x.f,'redeem',{amount:'1000',min_near:'0',deadline_ns:MAX},1n,false,40n*10n**12n);
    });
    await test('real failed native transfer and funded restoration',async()=>{
        const dead=await account('deleted',20n*N);await dead.deployContract(fixture);
        await measure('dead_register',alice,f,'storage_deposit',{account_id:dead.accountId,registration_only:false},N);
        await measure('dead_ft',alice,f,'ft_transfer',{receiver_id:dead.accountId,amount:N.toString(),memo:null},1n);
        const act={target:f.accountId,method:'redeem',args:{amount:N.toString(),min_near:'0',deadline_ns:MAX},deposit:'1'};
        const r=await measure('dead_redeem',alice,f,'act',act,0n,false,GAS,dead);const cid=value(r);
        await measure('delete_then_withdraw',alice,f,'delete_then_withdraw',{target:f.accountId,claim_id:cid,beneficiary:alice.accountId},0n,false,GAS,dead);
        const c=await view(f,'get_claim',{claim_id:cid});assert.equal(c.state,'refund_pending');
        const revived=await recreate(dead);await measure('known_failure_restore',revived,f,'retry_failed_claim',{claim_id:cid},1n);
        await measure('restored_pay',revived,f,'withdraw_claim',{claim_id:cid},1n);assert.equal((await view(f,'get_claim',{claim_id:cid})).state,'paid');
    });
    await test('full exit irrevocably closes while other liabilities remain',async()=>{
        const x=await deploy('terminal',wasm,10n*N);await measure('terminal_mint',x.owner,x.f,'mint',{min_tokens:'0',deadline_ns:MAX},N);
        const a=await view(x.f,'accounting');const cid=value(await measure('full_exit',x.owner,x.f,'redeem',{amount:a.T,min_near:a.R,deadline_ns:MAX},1n));
        const b=await view(x.f,'accounting');assert(b.closed);assert.equal(b.R,'0');assert(BigInt(b.C)>0n && BigInt(b.F)>0n);
        await measure('no_reopen_mint',x.owner,x.f,'mint',{min_tokens:'0',deadline_ns:MAX},N,true);
        await measure('no_reopen_contribution',x.owner,x.f,'contribute',{},N,true);
        await measure('terminal_payment',x.owner,x.f,'withdraw_claim',{claim_id:cid},1n);
    });
    await test('unknown callback outcome never authorizes a second payout',async()=>{
        const x=await deploy('fault',fault);const cid=value(await measure('fault_redeem',x.owner,x.f,'redeem',{amount:N.toString(),min_near:'0',deadline_ns:MAX},1n));
        const r=await measure('fault_pay',x.owner,x.f,'withdraw_claim',{claim_id:cid},1n,true);assert(r.receipts_outcome.some(x=>x.outcome.status.Failure));
        assert.equal((await view(x.f,'get_claim',{claim_id:cid})).state,'inflight');
        await measure('unknown_cannot_retry',x.owner,x.f,'retry_failed_claim',{claim_id:cid},1n,true);
        await measure('unknown_cannot_repay',x.owner,x.f,'withdraw_claim',{claim_id:cid},1n,true);
    });
    await test('bounded refund pool exhaustion rejects atomically under lost callbacks',async()=>{
        const x=await deploy('poolfault',fault);
        for(let index=0;index<8;index++){const raw=await measure(`pool_lost_${index}`,x.owner,x.f,'storage_deposit',{account_id:x.owner.accountId,registration_only:true},1000n);assert(raw.receipts_outcome.some(x=>x.outcome.status.Failure));}
        const before=await view(x.f,'accounting');assert.equal(before.refund_pool_used,8);
        await measure('pool_ninth_rejected',x.owner,x.f,'storage_deposit',{account_id:x.owner.accountId,registration_only:true},1000n,true);
        const after=await view(x.f,'accounting');for(const k of ['R','T','C','I','H','K','O'])assert.equal(after[k],before[k]);
    });
    await test('real refund cannot bypass conservative unresolved-I cushion',async()=>{
        const x=await deploy('guardfault',fault,20n*N);
        const unknown=value(await measure('guard_unknown_redeem',x.owner,x.f,'redeem',{amount:(10n*N).toString(),min_near:'0',deadline_ns:MAX},1n));
        await measure('guard_unknown_paid',x.owner,x.f,'withdraw_claim',{claim_id:unknown},1n,true);
        // LOCAL FAULT INJECTION ONLY: restore normal callback gas on this NEW
        // disposable account, preserving the old unknown attempt and state.
        // This is not an admitted economic transition or immutability evidence.
        const upgrade=await x.f.deployContract(wasm);evidence.push({name:'local_fault_fixture_restore_normal_code',raw:upgrade,account:x.f.accountId});save();
        const dead=await account('guarddead',20n*N);await dead.deployContract(fixture);
        await measure('guard_dead_register',x.owner,x.f,'storage_deposit',{account_id:dead.accountId,registration_only:false},N);
        await measure('guard_dead_tokens',x.owner,x.f,'ft_transfer',{receiver_id:dead.accountId,amount:N.toString(),memo:null},1n);
        const r=await measure('guard_failed_claim',x.owner,x.f,'act',{target:x.f.accountId,method:'redeem',args:{amount:N.toString(),min_near:'0',deadline_ns:MAX},deposit:'1'},0n,false,GAS,dead);const cid=value(r);
        await measure('guard_delete_then_withdraw',x.owner,x.f,'delete_then_withdraw',{target:x.f.accountId,claim_id:cid,beneficiary:x.owner.accountId},0n,false,GAS,dead);
        assert.equal((await view(x.f,'get_claim',{claim_id:cid})).state,'refund_pending');
        const revived=await recreate(dead);await measure('guard_restore_blocked',revived,x.f,'retry_failed_claim',{claim_id:cid},1n,true);
        const cash=await root.sendMoney(x.f.accountId,10n*N);evidence.push({name:'guard_separate_unallocated_cushion',raw:cash});save();
        await measure('guard_restore_with_real_cushion',revived,x.f,'retry_failed_claim',{claim_id:cid},1n);
        await measure('guard_restored_paid_once',revived,x.f,'withdraw_claim',{claim_id:cid},1n);
        assert.equal((await view(x.f,'get_claim',{claim_id:unknown})).state,'inflight');
    });
    await test('actual WASM near-U128 supply uses wide intermediate arithmetic',async()=>{
        const seed=100000000000000n;const x=await deploy('wide',wasm,seed,null,{initial_price:'1'});
        const a=await view(x.f,'accounting');assert.equal(a.T,(seed*N).toString());
        const c=BigInt(a.T)/2n,q=qRedeem(BigInt(a.R),BigInt(a.T),c);
        assert.equal((await view(x.f,'quote_redeem',{amount:c.toString()})).near,q.toString());
        await measure('wide_redeem',x.owner,x.f,'redeem',{amount:c.toString(),min_near:q.toString(),deadline_ns:MAX},1n,false,40n*10n**12n);
        assert.equal((await view(x.f,'quote_mint',{deposit:((1n<<128n)-1n).toString()})).error,'Overflow');
    });
    save();console.log(JSON.stringify({tests:tests.length,receipts:evidence.length,status:'PASS'}));
} catch(e){save(e.stack);console.error(e.stack);process.exitCode=1;}
