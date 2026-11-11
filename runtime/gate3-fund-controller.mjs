import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..'),plan=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/planned-accounts.json'))),pub=JSON.parse(fs.readFileSync(path.join(ROOT,'testnet/public-keys.json'))).public_keys[plan.controller];
const endpoint='https://rpc.testnet.near.org';
async function rpc(method,params){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});return r.json();}
if((await rpc('status',[])).result?.chain_id!=='testnet')throw Error('STOP: not testnet');
const q={request_type:'view_account',account_id:plan.controller,finality:'final'};let account=await rpc('query',q);const report={network:'testnet',controller:plan.controller,public_key:pub,attempted_at:new Date().toISOString(),before:account};
if(!account.result){if(account.error?.cause?.name!=='UNKNOWN_ACCOUNT')throw Error('Unverified account availability');
 const marker=path.join(ROOT,'testnet/evidence/faucet-attempt.json');if(fs.existsSync(marker))throw Error('Faucet already attempted; inspect before any retry');fs.writeFileSync(marker,JSON.stringify({network:'testnet',account:plan.controller,started_at:report.attempted_at},null,2));
 try{const r=await fetch('https://helper.testnet.near.org/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:plan.controller,newAccountPublicKey:pub}),signal:AbortSignal.timeout(45000)});report.faucet_http_status=r.status;report.faucet_response=await r.text();}catch(e){report.faucet_transport_error=e.message;}
 for(let i=0;i<12;i++){account=await rpc('query',q);if(account.result)break;await new Promise(r=>setTimeout(r,2000));}
}
report.after=account;report.access_key=await rpc('query',{request_type:'view_access_key',account_id:plan.controller,public_key:pub,finality:'final'});
fs.writeFileSync(path.join(ROOT,'testnet/evidence/funding.json'),JSON.stringify(report,null,2));
if(!account.result||!report.access_key.result)throw Error('STOP: controller funding/key ownership not established; inspect funding.json');
const minimum=95n*10n**23n;if(BigInt(account.result.amount)<minimum)throw Error('STOP: fixed faucet grant is below the 9.5-NEAR verified core budget; do not overspend');
console.log(JSON.stringify({network:'testnet',controller:plan.controller,balance_NEAR:(Number(BigInt(account.result.amount))/1e24).toString(),core_cap_NEAR:'9.5',key_verified:true},null,2));
