import fs from 'node:fs';
const [rpc,account,expectedCode,expectedKeys,ids='',journal='monitor-state.json']=process.argv.slice(2);
if(!rpc||!account||!expectedCode||!expectedKeys)throw Error('Usage: monitor.mjs RPC ACCOUNT EXPECTED_CODE EXPECTED_KEYS_JSON CLAIM_IDS JOURNAL');
async function query(params){const r=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'readonly',method:'query',params:{...params,finality:'final'}})});const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));return j.result}
async function view(method,args={}){return JSON.parse(Buffer.from((await query({request_type:'call_function',account_id:account,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')})).result))}
const state=fs.existsSync(journal)?JSON.parse(fs.readFileSync(journal)):{};
const a=await query({request_type:'view_account',account_id:account}),keys=await query({request_type:'view_access_key_list',account_id:account}),ledger=await view('accounting');
const alerts=[];
const receiptFile=process.argv[8];
if(receiptFile){
  const records=JSON.parse(fs.readFileSync(receiptFile));
  for(const r of (Array.isArray(records)?records:[records])){
    for(const outcome of r.receipts_outcome??r.result?.receipts_outcome??[]){
      if(outcome.outcome.executor_id===account&&outcome.outcome.status.Failure)alerts.push('CONTRACT_RECEIPT_FAILURE:'+outcome.id);
    }
  }
}
if(a.code_hash!==expectedCode)alerts.push('CODE_CHANGED');
const actualKeys=keys.keys.map(x=>({public_key:x.public_key,permission:x.access_key.permission}));
if(JSON.stringify(actualKeys)!==JSON.stringify(JSON.parse(fs.readFileSync(expectedKeys))))alerts.push('KEYS_CHANGED');
if(BigInt(a.amount)<BigInt(ledger.local_required))alerts.push('LOCAL_RESERVE_DEFICIT');
if(BigInt(ledger.storage_total)+BigInt(ledger.operational)<BigInt(ledger.storage_stake))alerts.push('STORAGE_DEFICIT');
for(const id of ids.split(',').filter(Boolean)){const c=await view('get_claim',{claim_id:id});if(c?.state===1){state[id]??=Date.now();if(Date.now()-state[id]>300000)alerts.push('AGED_INFLIGHT:'+id)}else delete state[id]}
fs.writeFileSync(journal,JSON.stringify(state));
console.log(JSON.stringify({account,alerts,ledger,keys:actualKeys,note:'Age is time since monitor first observed InFlight. Claim list must come from complete indexing. Inspect callback receipts externally; never resend automatically.'},null,2));
