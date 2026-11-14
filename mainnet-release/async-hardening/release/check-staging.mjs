import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire('file:///E:/near-2/frontend/package.json')('@playwright/test');
const out=path.resolve(import.meta.dirname,'../runtime/evidence/release-rc1'),errors=[],rpc=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/rpc\.|near\.org/.test(r.url()))rpc.push(r.url())});await page.goto('http://127.0.0.1:4187');assert.equal(await page.locator('h1').innerText(),'Floorline RC1 staging');assert((await page.locator('body').innerText()).includes('Disabled until'));assert.equal(await page.getByRole('button').count(),0);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:path.join(out,'staging-'+name+'.png'),fullPage:true});await page.close()}assert.equal(errors.length,0);assert.equal(rpc.length,0);fs.writeFileSync(path.join(out,'staging-browser.json'),JSON.stringify({passed:true,scope:'Unconfigured staging build only; no signing, wallet session or deployed target',desktop:true,mobile:true,errors,rpc_requests:rpc.length},null,2));console.log('PASS desktop/mobile disabled staging; zero RPC and signing requests')}finally{await browser.close()}
