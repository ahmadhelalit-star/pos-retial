// Uses only sham_retail_dev. Creates one zero-stock product; never opens a shift or posts a sale.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import { root,privateDir,settings,readJSON,saveJSON } from './common.mjs';
import { createPool } from '../backend/src/db/pool.js';
const run=promisify(execFile);
async function main(){
  const config=await settings(),state=await readJSON('setup-state.json',null),login=await readJSON('login.json',null);assert.ok(state?.complete&&login,'Developer setup and local login required');
  const control=command=>run(process.execPath,[join(root,'developer/manage.mjs'),command],{cwd:root,windowsHide:true,timeout:60000});
  await control('start');
  const directory=join(privateDir,'verification');await mkdir(directory,{recursive:true});
  const chrome=process.env.RETAIL_DEV_BROWSER??'C:/Program Files/Google/Chrome/Application/chrome.exe',options={executablePath:chrome,headless:true,viewport:{width:1440,height:1000}},profile=join(directory,'browser-profile');
  const pool=createPool(config.env.DATABASE_URL),before=(await pool.query('SELECT kind,count(*) count FROM commercial_documents GROUP BY kind ORDER BY kind')).rows;
  let context;const errors=[],writes=[];
  async function open(){context=await chromium.launchPersistentContext(profile,options);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST')writes.push(new URL(request.url()).pathname);});await page.goto(config.origin+'/inventory');await page.waitForFunction(()=>Boolean(document.querySelector('input[name=username]'))||Boolean(document.querySelector('input[placeholder]')));if(await page.locator('input[name=username]').count()){await page.locator('input[name=username]').fill(login.username);await page.locator('input[name=password]').fill(login.password);await page.locator('form button[type=submit], form button').last().click();}await page.getByPlaceholder(/ابحث باسم المادة|Search.*barcode/i).waitFor();return page;}
  try{
    let page=await open();const session=await(await context.request.get(config.origin+'/api/auth/me')).json();assert.equal(session.user.username,login.username);
    const activation=await(await context.request.get(config.origin+'/api/offline-activation/status')).json();assert.equal(activation.status,'ACTIVE');for(const file of ['.env','login.json','activation/test-key-access.json']){const path=join(privateDir,file).replaceAll('\\','/');const denied=await context.request.get(config.origin+'/@fs/'+path);assert.equal(denied.status(),403,'Private Developer files must not be served by Vite');}
    let sample=await readJSON('verification-product.json',null);if(!sample){sample={id:'developer-persistence-'+randomUUID(),name:'Developer persistence check '+new Date().toISOString().slice(0,10),price:7.5};await saveJSON('verification-product.json',sample);}
    let response=await context.request.get(config.origin+'/api/products/'+sample.id);
    if(response.status()===404){response=await context.request.post(config.origin+'/api/products',{headers:{'X-CSRF-Token':session.csrfToken},data:{...sample,type:'stock',costPrice:0,stock:0}});assert.equal(response.status(),201);}
    else assert.equal(response.status(),200);
    let product=await response.json();assert.equal(product.id,sample.id);assert.equal(product.name,sample.name);assert.equal(Number(product.price),sample.price);
    await page.getByPlaceholder(/ابحث باسم المادة|Search.*barcode/i).fill(sample.name);await page.locator('tbody').getByText(sample.name,{exact:true}).waitFor();await page.screenshot({path:join(directory,'products-before-restart.png'),fullPage:true});
    await page.goto(config.origin+'/sales');await page.getByText(/متصل بالسيرفر|Connected to server/).waitFor();assert.equal(await page.getByText('تجربة محلية / Local demo',{exact:true}).count(),0);await page.screenshot({path:join(directory,'cashier-connected.png'),fullPage:true});const other=await context.newPage();await other.goto(config.origin+'/sales');await other.getByRole('alert').filter({hasText:'الكاشير مفتوح في نافذة أخرى'}).waitFor();await other.close();
    await context.close();context=null;await control('stop');await control('start');
    page=await open();response=await context.request.get(config.origin+'/api/products/'+sample.id);assert.equal(response.status(),200);product=await response.json();assert.equal(product.name,sample.name);assert.equal(Number(product.price),sample.price);
    await page.getByPlaceholder(/ابحث باسم المادة|Search.*barcode/i).fill(sample.name);await page.locator('tbody').getByText(sample.name,{exact:true}).waitFor();await page.screenshot({path:join(directory,'products-after-restart.png'),fullPage:true});
    const after=(await pool.query('SELECT kind,count(*) count FROM commercial_documents GROUP BY kind ORDER BY kind')).rows;assert.deepEqual(after,before);assert.equal(writes.filter(path=>/^\/api\/(sales|purchases|payments)(\/|$)/.test(path)).length,0);assert.deepEqual(errors,[]);
    const result={passed:true,database:'sham_retail_dev',url:config.origin+'/inventory',login:true,activation:'ACTIVE',cashierConnected:true,secondTabBlocked:true,privateFilesBlocked:true,productId:sample.id,productAfterBackendRestart:true,productAfterBrowserRestart:true,commercialDocumentCountsUnchanged:true,noSalesPosted:true,verifiedAt:new Date().toISOString()};await saveJSON('verification/result.json',result);console.log(JSON.stringify(result,null,2));
  }finally{await context?.close();await pool.end();}
}
main().catch(error=>{console.error(error.code?`Developer verification failed (${error.code}); inspect private logs.`:error.message);process.exitCode=1;});
