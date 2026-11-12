import {chromium} from '@playwright/test';import fs from 'node:fs';
const base='http://127.0.0.1:4176',dir='qa/product-completion';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const routes=[['landing','/'],['overview','/app'],['treasury','/app/treasury'],['loans','/app/loans'],['governance','/app/governance'],['activity','/app/activity']],results=[];
for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [name,route] of routes){await page.goto(base+route);await page.locator('h1').waitFor();await page.waitForTimeout(1800);await page.evaluate(()=>document.fonts.ready);
  const screenshot=`${dir}/${name}-${device}.png`;await page.screenshot({path:screenshot,fullPage:true});
  results.push({name,device,route,screenshot,heading:await page.locator('h1').innerText(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),runtime_errors:[...errors],live_error_banners:await page.getByRole('alert').allTextContents()});
 }
 await context.close();
}
await browser.close();fs.writeFileSync(`${dir}/production-browser.json`,JSON.stringify({scope:'Built frontend, live read-only RPC, disconnected wallets, desktop/mobile; no signing',transactions_submitted:0,results},null,2)+'\n');
console.log(JSON.stringify({captures:results.length,runtime_errors:results.filter(r=>r.runtime_errors.length).length,overflow:results.filter(r=>r.overflow).length}));
if(results.some(r=>r.runtime_errors.length||r.overflow))process.exitCode=1;
