import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';
import { MOCK_PRODUCTS } from '../src/data/mockProducts.js';

test('Retail browser smoke on synthetic UI database',async t=>{
  assert.ok(process.env.TEST_UI_USERNAME&&process.env.TEST_UI_PASSWORD,'Explicit synthetic UI credentials required');
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  // Exercise offline-safe system font fallbacks without external font network dependencies.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
  page.setDefaultTimeout(10000);
  const base=process.env.TEST_BASE_URL??'http://127.0.0.1:5188',output=resolve(process.env.UI_ARTIFACT_DIR??'../work/browser-smoke');
  await mkdir(output,{recursive:true});
  const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/api/'))requests.push({url:request.url(),method:request.method()});});
  const name=`UI synthetic ${randomUUID().slice(0,8)}`;
  try{
    await t.test('login screen, English/LTR and dark theme render',async()=>{
      await page.goto(base);await page.getByRole('button',{name:'English',exact:true}).click();assert.equal(await page.locator('html').getAttribute('dir'),'ltr');await page.getByRole('button',{name:'Dark',exact:true}).click();await page.screenshot({path:resolve(output,'retail-phase-2-login.png'),fullPage:true});
    });
    await t.test('real login loads server catalog and session survives navigation',async()=>{
      await page.locator('input[name=username]').fill(process.env.TEST_UI_USERNAME);await page.locator('input[name=password]').fill(process.env.TEST_UI_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Products',exact:true}).waitFor();await page.getByText('ملخص الصفحة الحالية / Current page summary').waitFor();assert.ok(requests.some(request=>request.url.includes('/api/products?page=1&limit=50')));
    });
    await t.test('create product persists through authenticated API and reload',async()=>{
      await page.getByRole('button',{name:'إضافة منتج جديد',exact:true}).click();const form=page.locator('form');await form.locator('input[type=text]').nth(0).fill(name);await form.locator('input[type=number]').nth(0).fill('11');await page.getByRole('button',{name:'إضافة المنتج',exact:true}).click();await page.locator('tbody').getByText(name,{exact:true}).waitFor();await page.reload();await page.locator('tbody').getByText(name,{exact:true}).waitFor();
    });
    await t.test('search uses server pagination and editing preserves product',async()=>{
      await page.getByPlaceholder('ابحث باسم المادة أو الباركود SKU...').fill(name);await page.waitForResponse(response=>response.url().includes('/api/products?')&&new URL(response.url()).searchParams.get('q')===name&&response.status()===200);const row=page.locator('tbody tr').filter({hasText:name});await row.getByTitle('تعديل بيانات المنتج').click();await page.locator('form input[type=text]').nth(0).fill(`${name} edited`);await page.getByRole('button',{name:'حفظ التعديلات',exact:true}).click();await page.locator('tbody').getByText(`${name} edited`,{exact:true}).waitFor();
    });
    await t.test('stock movement posts documented ledger and refreshes visible balance',async()=>{
      const row=page.locator('tbody tr').filter({hasText:name});await row.getByTitle('تسجيل حركة مخزون موثقة').first().click();await page.getByLabel('Quantity',{exact:true}).fill('4');await page.getByLabel('Cost per selected unit',{exact:true}).fill('3');await page.getByLabel('Document reference',{exact:true}).fill(`UI-${randomUUID()}`);const response=page.waitForResponse(response=>response.url().includes('/api/stock/movements')&&response.request().method()==='POST');await page.getByRole('button',{name:'Post movement',exact:true}).click();assert.equal((await response).status(),201);await row.getByText('كمية منخفضة (4)',{exact:true}).waitFor();await page.screenshot({path:resolve(output,'retail-phase-2-catalog.png'),fullPage:true});
    });
    await t.test('module settings cannot grant a license',async()=>{
      await page.getByRole('button',{name:'Modules',exact:true}).click();await page.getByText(/Business preferences never grant a license|Offline activation is not connected/).waitFor();const checkbox=page.getByRole('checkbox').first();const response=page.waitForResponse(response=>response.url().includes('/api/modules/advancedAccounting')&&response.request().method()==='PUT'&&response.status()===200);await checkbox.setChecked(!await checkbox.isChecked());await response;assert.equal(await page.getByText('Advanced Accounting',{exact:true}).locator('..').getByText('Available',{exact:true}).count(),0);await page.screenshot({path:resolve(output,'retail-phase-2-modules.png'),fullPage:true});
    });
    await t.test('Arabic/RTL and mobile layout have no document overflow',async()=>{
      await page.getByRole('button',{name:'العربية',exact:true}).click();assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'إظهار القائمة الجانبية',exact:true}).waitFor();await page.screenshot({path:resolve(output,'retail-phase-2-mobile.png'),fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.setViewportSize({width:1440,height:1000});
    });
    await t.test('legacy checkout remains explicitly isolated and cannot write server inventory',async()=>{
      await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await page.getByRole('button',{name:'فتح التجربة المحلية المنفصلة',exact:true}).click();await page.getByText('تجربة محلية / Local demo',{exact:true}).waitFor();const count=requests.filter(request=>request.method!=='GET').length;await page.getByRole('button').filter({hasText:MOCK_PRODUCTS[0].name}).first().click();await page.locator('article').filter({hasText:MOCK_PRODUCTS[0].name}).waitFor();assert.equal(requests.filter(request=>request.method!=='GET').length,count);await page.getByRole('button',{name:'العودة للخادم / Return to server',exact:true}).click();await page.locator('input[name=username]').waitFor();
    });
    await t.test('logout returns to login and no browser runtime errors occurred',async()=>{await page.locator('input[name=username]').waitFor();assert.deepEqual(errors,[]);});
  }finally{await context.close();await browser.close();}
});
