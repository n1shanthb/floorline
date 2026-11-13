// Automated production UI tests requested by the acceptance brief.
// Fresh unauthenticated browser context; real RPC only; never signs or imports keys.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('frontend/package.json'));
const {chromium}=require('@playwright/test');
const j=JSON.parse(fs.readFileSync('TESTNET_ACCEPTANCE_TRANSACTIONS.json'));
assert(j.final,'Run UI reconciliation after final on-chain state');
const dir='acceptance-execution/screenshots';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={scope:'Actual production frontend + real RPC; clean unauthenticated browser; no wallet signing, no mock data, no journal injection',checked_at:new Date().toISOString(),baseURL:'http://127.0.0.1:4181',pages:[],errors:[],transactions_submitted:0,browser_signing:'BLOCKED_NO_AUTHENTICATED_TESTNET_WALLET',activity_imported_from_CLI:false};
const routes=['/','/app','/app/treasury','/app/loans','/app/governance','/app/activity'];
const units=(n,p=8)=>{n=BigInt(n);const f=(n%10n**24n).toString().padStart(24,'0').slice(0,p).replace(/0+$/,'');return `${n/10n**24n}${f?'.'+f:''}`;};
try{for(const [mode,width,height] of [['desktop',1440,1000],['mobile',390,844]]){const context=await browser.newContext({viewport:{width,height},isMobile:mode==='mobile',hasTouch:mode==='mobile',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));let ledger=null;page.on('response',async r=>{if(!r.url().includes('test.rpc.fastnear.com'))return;try{const d=await r.json();if(d.result?.result){const parsed=JSON.parse(Buffer.from(d.result.result).toString());if(parsed.L&&parsed.T)ledger=parsed;}}catch{}});
 for(const [idx,route] of routes.entries()){await page.goto(report.baseURL+route);await page.locator('h1').waitFor();if(route!=='/')await page.getByText(/RPC snapshot · block/).waitFor({timeout:45000});const heading=await page.locator('h1').innerText();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,`${mode} ${route} horizontal overflow`);const body=await page.locator('body').innerText();if(route==='/app/treasury'){assert(ledger,'no live ledger observed');assert.equal(ledger.L,j.final.ledger.L);assert.equal(ledger.T,j.final.ledger.T);assert(body.includes(units(j.final.ledger.L)));assert(body.includes(units(j.final.ledger.T)));report[`${mode}_treasury`]={L:ledger.L,T:ledger.T,exact_rpc_matches_final:true};await page.getByRole('button',{name:'Issue',exact:true}).click();await page.getByText(/dilutive|issuance.*unavailable|issuance.*paused/i).first().waitFor({timeout:10000});}
 if(route==='/app/governance'){const proposed=j.transactions.find(t=>t.name==='dao_add_contribution');const id=proposed?Number(proposed.value):0;await page.getByLabel('Live proposal ID',{exact:true}).fill(String(id));await page.getByRole('button',{name:'Inspect live proposal',exact:true}).click();await page.getByText('Status: Approved.',{exact:false}).waitFor({timeout:45000});report[`${mode}_proposal`]={id,status:'Approved',historical:!proposed,read_through_actual_UI:true};}
 if(route==='/app/activity'){assert(body.includes('No submitted transaction has been reconciled in this browser.'));report[`${mode}_activity`]='CLI transactions correctly absent from this clean browser journal; historical replay remains separate';}
 const screenshot=`${dir}/${mode}-${idx}.png`;await page.screenshot({path:screenshot,fullPage:true});report.pages.push({mode,route,heading,overflow,screenshot,live_ledger:ledger?{L:ledger.L,T:ledger.T}:null});}
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('button',{name:'Connect My NEAR Wallet',exact:true}).waitFor();report[`${mode}_wallet_dialog`]='PASS_DISCONNECTED_CONNECT_DIALOG';await page.screenshot({path:`${dir}/${mode}-wallet-dialog.png`,fullPage:true});
 // Navigation to the provider is a read-only handoff; no login/security prompt bypass.
 if(mode==='desktop'){try{const popupPromise=context.waitForEvent('page',{timeout:20000});await page.getByRole('button',{name:'Connect My NEAR Wallet',exact:true}).click();const popup=await popupPromise;await popup.waitForURL('https://testnet.mynearwallet.com/**',{timeout:25000});const url=new URL(popup.url());report.wallet_handoff={origin:url.origin,path:url.pathname,contract_access_key_requested:url.searchParams.has('public_key')||url.searchParams.has('contract_id'),authenticated:false};await popup.screenshot({path:`${dir}/wallet-provider.png`,fullPage:true});await popup.close();}catch(e){report.wallet_handoff={status:'BLOCKED',reason:e.message};}}
 await context.close();}
 report.result=report.errors.length?'FAIL':'PASS_READ_ONLY_UI_ONLY';
}catch(e){report.result='FAIL';report.failure=e.message;process.exitCode=1;}finally{await browser.close();fs.writeFileSync('acceptance-execution/BROWSER_QA.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
