import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..'),file=path.join(ROOT,'TESTNET_EVIDENCE.json');
let data=JSON.parse(fs.readFileSync(file));const results=[];
for(const row of data.transactions){if(row.explorer_verified||row.explorer_index_verified)continue;
 const api=`https://api-testnet.nearblocks.io/v3/txns/${row.hash}`;let item={hash:row.hash,url:row.explorer_url,api_url:api,checked_at:new Date().toISOString()};
 try{const r=await fetch(api,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});const body=await r.text();item.api_http_status=r.status;item.retry_after=r.headers.get('retry-after');if(r.status===429){item.rate_limited=true;results.push(item);console.log('Indexer rate limit: stopped without further requests; respect Retry-After.');break;}let value;try{value=JSON.parse(body);}catch{}
  item.indexer_hash_confirmed=r.ok&&value?.data?.transaction_hash===row.hash&&value?.data?.signer_account_id===row.signer&&value?.data?.receiver_account_id===row.receiver;
  item.indexer_transaction=value?.data;
  item.page_verification='Canonical NearBlocks HTML route retained; earlier domain fetch returned HTTP 403. No claim that the HTML page rendered.';
  item.verified=false;item.index_verified=Boolean(item.indexer_hash_confirmed);
 }catch(e){item.error=e.message;item.verified=false;}
 results.push(item);console.log(JSON.stringify({hash:row.hash,verified:item.verified,api_status:item.api_http_status,page_status:item.page_http_status,error:item.error}));
 await new Promise(r=>setTimeout(r,7000));
}
// Reload so an active execution journal is never overwritten with an old snapshot.
data=JSON.parse(fs.readFileSync(file));for(const item of results){const row=data.transactions.find(x=>x.hash===item.hash);if(row){row.explorer_verified=item.verified;row.explorer_index_verified=item.index_verified;row.verified_explorer_data_url=item.index_verified?item.api_url:null;row.explorer_verification=item;}}
fs.writeFileSync(file,JSON.stringify(data,null,2));fs.writeFileSync(path.join(ROOT,'testnet/evidence/explorer-verification.json'),JSON.stringify(results,null,2));
