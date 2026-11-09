import {normalizeProduct} from '../../shared/catalog.js';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {privateDir} from '../../developer/common.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {settings} from '../../developer/common.mjs';
test('existing product can allocate stock to variants without increasing its total',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage(),errors=[],unexpected=[];let products=[normalizeProduct({id:'p1',name:'Existing product',price:5,costPrice:3,stock:20,type:'stock',unit:'\u0642\u0637\u0639\u0629',version:1})],creates=0;
 const user={id:'11111111-1111-4111-8111-111111111111',name:'Test',companyId:'22222222-2222-4222-8222-222222222222',permissions:['catalog.read','catalog.create','catalog.update','stock.post','organization.read'],roles:[{is_admin:true}],branches:['33333333-3333-4333-8333-333333333333'],warehouses:['44444444-4444-4444-8444-444444444444']};
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>{const r=route.request(),path=new URL(r.url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{user,csrfToken:'mock'}});
  if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail'}});
  if(path==='/api/organization')return route.fulfill({json:{company:{name:'Test',base_currency:'SAR'},categories:[],branches:[{id:user.branches[0],name:'Main'}],warehouses:[{id:user.warehouses[0],name:'Main',branch_id:user.branches[0]}],currencies:[{code:'SAR',rate:1}],taxes:[]}});
  if(path==='/api/modules')return route.fulfill({json:{items:[]}});
  if(path==='/api/products'&&r.method()==='GET')return route.fulfill({json:{items:products,total:products.length}});
  if(path==='/api/products/p1/variant-balances')return route.fulfill({json:{version:1,items:[{warehouseId:user.warehouses[0],name:'Main',quantity:'20.000000000'}]}});
  if(path==='/api/products/p1'&&r.method()==='PUT'){const body=r.postDataJSON();assert.equal(body.stock,0);assert.equal(body.variants.length,2);assert.deepEqual(body.variants.map(row=>row.stock),[0,0]);assert.equal(body.variantDistribution[0].expectedQuantity,'20.000000000');assert.deepEqual(body.variantDistribution[0].items.map(row=>row.quantity),[12,8]);creates++;const {variantDistribution,...product}=body;products=[{...product,version:2,stock:20,variants:product.variants.map(row=>({...row,stock:variantDistribution[0].items.find(item=>item.variantId===row.id).quantity}))}];return route.fulfill({json:products[0]});}

  unexpected.push(r.method()+' '+path);return route.abort();
 });
 try{
  await page.setViewportSize({width:1280,height:950});await page.goto(cfg.origin+'/inventory');await page.getByTitle('تعديل بيانات المنتج',{exact:true}).last().click();await page.getByRole('button',{name:'الألوان والمقاسات',exact:true}).click();
  await page.getByRole('button',{name:'+ إضافة خاصية',exact:true}).click();await page.getByLabel('اسم الخاصية',{exact:true}).fill('Color');await page.getByLabel('القيم (افصل بفاصلة)',{exact:true}).fill('Black,White');
  await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();await page.getByLabel('Color',{exact:true}).first().selectOption('Black');await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();await page.getByLabel('Color',{exact:true}).last().selectOption('White');
  const save=page.getByRole('button',{name:'حفظ التعديلات',exact:true});assert.equal(await save.isDisabled(),true);await page.getByLabel('توزيع Main 1',{exact:true}).fill('12');await page.getByLabel('توزيع Main 2',{exact:true}).fill('9');assert.equal(await save.isDisabled(),true);await page.getByLabel('توزيع Main 2',{exact:true}).fill('8');await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.includes('حفظ التعديلات')&&!button.disabled));assert.equal(await save.isDisabled(),false);
  const directory=join(privateDir,'ui-review','variant-distribution');await mkdir(directory,{recursive:true});await page.screenshot({path:join(directory,'distribution.png'),fullPage:true});await save.click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(creates,1);assert.equal(products[0].stock,20);assert.deepEqual(products[0].variants.map(row=>row.stock),[12,8]);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 }finally{await browser.close();}
});
