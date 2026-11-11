import fs from 'node:fs';
const s=fs.readFileSync('E:/near-2/testnet/evidence/explorer-selector.html','utf8');
const m=s.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);console.log(m?m[1]:s.match(/https?:[^"<> ]+/g)?.slice(-30));
const hash='6mFfa348aj5E6TcZQSRyK2VmTcJeNtikxKaPsaE4agBJ';
for(const url of [`https://api-testnet.nearblocks.io/v3/txns/${hash}`,`https://explorer.testnet.near.org/transactions/${hash}`]){
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});const body=await r.text();fs.writeFileSync('E:/near-2/testnet/evidence/'+(url.includes('/v3/')?'explorer-v3-response.txt':'explorer-selector-transaction.html'),body);console.log(JSON.stringify({url,status:r.status,has_hash:body.includes(hash),sample:body.slice(0,600)}));
}
