import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {normalizeProduct} from '../../shared/catalog.js';
import {settings,privateDir} from '../../developer/common.mjs';

test('inventory categories update server lists, product editor and cashier without live business writes',async t=>{
 const config=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],unexpected=[],writes=[];
 const directory=join(privateDir,'ui-review','categories');await mkdir(directory,{recursive:true});
 const user={id:'11111111-1111-4111-8111-111111111111',companyId:'22222222-2222-4222-8222-222222222222',name:'مدير التجربة',permissions:['organization.read','catalog.read','catalog.create','catalog.update','catalog.archive','sales.post'],roles:[{is_admin:true}],branches:['33333333-3333-4333-8333-333333333333'],warehouses:['44444444-4444-4444-8444-444444444444']};
 let categories=[{id:'beverages',name:'beverages'},{id:'existing',name:'تصنيف مرتبط'}],createdId=null;
 let products=[normalizeProduct({id:'p1',name:'منتج تجريبي',price:10,costPrice:0,stock:0,barcode:'001',unit:'حبة',version:1,category:'existing',currency:'SAR'})];
 const categoryRows=()=>categories.map(row=>({...row,productCount:products.filter(product=>product.category===row.id).length,activeProductCount:products.filter(product=>product.category===row.id).length}));
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('**/api/**',route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method(),body=request.postDataJSON();
  if(path==='/api/auth/me')return route.fulfill({json:{user,csrfToken:'mock-csrf'}});
  if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail',setupRequired:false}});
  if(path==='/api/organization')return route.fulfill({json:{company:{name:'متجر التجربة',base_currency:'SAR',allow_negative_stock:false},branches:[{id:user.branches[0],name:'الرئيسي'}],warehouses:[{id:user.warehouses[0],name:'المخزن الرئيسي',branch_id:user.branches[0]}],currencies:[{code:'SAR',rate:1,decimals:2}],taxes:[],categories}});
  if(path==='/api/categories'&&method==='GET')return route.fulfill({json:{items:categoryRows()}});
  if(path==='/api/categories'&&method==='POST'){writes.push({path,method,body});createdId='new-'+writes.length;categories.push({id:createdId,name:body.name});return route.fulfill({status:201,json:{id:createdId,name:body.name}});}
  if(path.endsWith('/order')&&method==='PUT'){writes.push({path,method,body});const id=path.split('/').at(-2),at=categories.findIndex(row=>row.id===id),next=at+(body.direction==='up'?-1:1);if(next>=0&&next<categories.length)[categories[at],categories[next]]=[categories[next],categories[at]];return route.fulfill({json:{items:categoryRows()}});}
  if(path.startsWith('/api/categories/')&&method==='PUT'){writes.push({path,method,body});const row=categories.find(row=>row.id===decodeURIComponent(path.split('/').at(-1)));row.name=body.name;return route.fulfill({json:row});}
  if(path.startsWith('/api/categories/')&&method==='DELETE'){writes.push({path,method});const id=path.split('/').at(-1);assert.ok(!products.some(product=>product.category===id));categories=categories.filter(row=>row.id!==id);return route.fulfill({json:{id,deleted:true}});}
  if(path==='/api/products'&&method==='GET'){const category=url.searchParams.get('category'),items=products.filter(row=>!category||row.category===category);return route.fulfill({json:{items,total:items.length,page:1,limit:50}});}
  if(path==='/api/products/p1'&&method==='PUT'){writes.push({path,method,body});products=[{...body,version:2}];return route.fulfill({json:products[0]});}
  if(['/api/modules','/api/shifts','/api/partners'].includes(path)&&method==='GET')return route.fulfill({json:{items:[]}});
  if(path==='/api/health')return route.fulfill({json:{status:'ok',product:'retail',epoch:'mock-epoch'}});
  unexpected.push(method+' '+path);return route.abort();
 });
 const go=async path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
 try{
  await t.test('inventory button opens category management; create, rename, duplicate and empty deletion',async()=>{
   await page.goto(config.origin+'/inventory');await page.getByRole('button',{name:'التصنيفات',exact:true}).click();assert.ok(page.url().includes('tab=categories'));await page.getByRole('heading',{name:'إدارة التصنيفات',exact:true}).waitFor();await page.getByRole('article',{name:'تصنيف مرتبط',exact:true}).waitFor();
   assert.ok(await page.getByRole('button',{name:'حذف تصنيف مرتبط',exact:true}).isDisabled());await page.getByRole('article',{name:'المشروبات والعصائر',exact:true}).waitFor();
   await page.getByLabel('اسم التصنيف',{exact:true}).fill('تصنيف جديد');await page.getByRole('button',{name:'إضافة تصنيف',exact:true}).click();await page.getByText('تم حفظ التصنيف',{exact:true}).waitFor();const id=createdId;
   await page.getByRole('button',{name:'تعديل تصنيف جديد',exact:true}).click();await page.getByLabel('اسم التصنيف',{exact:true}).fill('تصنيف معدل');await page.getByRole('button',{name:'حفظ التعديل',exact:true}).click();await page.getByRole('article',{name:'تصنيف معدل',exact:true}).waitFor();assert.equal(categories.find(row=>row.name==='تصنيف معدل').id,id);
   const before=writes.length;await page.getByLabel('اسم التصنيف',{exact:true}).fill('تصنيف مرتبط');await page.getByRole('button',{name:'إضافة تصنيف',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(writes.length,before);
   await page.getByLabel('اسم التصنيف',{exact:true}).fill('تصنيف مؤقت');await page.getByRole('button',{name:'إضافة تصنيف',exact:true}).click();await page.getByRole('article',{name:'تصنيف مؤقت',exact:true}).getByRole('button',{name:'عرض المنتجات',exact:true}).click();await page.getByLabel('تصفية حسب التصنيف',{exact:true}).waitFor();assert.equal(await page.getByLabel('تصفية حسب التصنيف',{exact:true}).inputValue(),createdId);await page.getByRole('button',{name:'التصنيفات',exact:true}).click();await page.getByRole('button',{name:'حذف تصنيف مؤقت',exact:true}).click();await page.getByText('تم حذف التصنيف',{exact:true}).waitFor();assert.ok(!categories.some(row=>row.name==='تصنيف مؤقت'));await page.getByRole('button',{name:'إغلاق التصنيفات',exact:true}).click();await page.getByLabel('تصفية حسب التصنيف',{exact:true}).waitFor();assert.equal(await page.getByLabel('تصفية حسب التصنيف',{exact:true}).inputValue(),'all');await page.getByRole('button',{name:'التصنيفات',exact:true}).click();await page.getByRole('article',{name:'تصنيف معدل',exact:true}).waitFor();
   await page.screenshot({path:join(directory,'categories-desktop.png'),fullPage:true});
  });
  await t.test('arrow order is saved and retained on reload',async()=>{
   await page.getByRole('button',{name:'\u062a\u0623\u062e\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0628\u0627\u062a \u0648\u0627\u0644\u0639\u0635\u0627\u0626\u0631',exact:true}).click();
   await page.getByText('\u062a\u0645 \u062d\u0641\u0638 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0639\u0631\u0636',{exact:true}).waitFor();assert.equal(categories[0].id,'existing');
   await page.reload();await page.getByRole('article',{name:'\u062a\u0635\u0646\u064a\u0641 \u0645\u0631\u062a\u0628\u0637',exact:true}).waitFor();assert.equal(await page.getByRole('article').first().getAttribute('aria-label'),'\u062a\u0635\u0646\u064a\u0641 \u0645\u0631\u062a\u0628\u0637');
  });
  await t.test('view category products and assign the new category through the existing product editor',async()=>{
   await page.getByRole('article',{name:'تصنيف مرتبط',exact:true}).getByRole('button',{name:'عرض المنتجات',exact:true}).click();await page.getByLabel('تصفية حسب التصنيف',{exact:true}).waitFor();assert.equal(await page.getByLabel('تصفية حسب التصنيف',{exact:true}).inputValue(),'existing');
   await page.getByTitle('تعديل بيانات المنتج',{exact:true}).last().click();const options=await page.getByLabel('تصنيف المنتج',{exact:true}).locator('option').allTextContents();assert.ok(options.some(value=>value.includes('تصنيف معدل')));assert.ok(!options.some(value=>value.includes('الألبان والأجبان')));
   const id=categories.find(row=>row.name==='تصنيف معدل').id;await page.getByLabel('تصنيف المنتج',{exact:true}).selectOption(id);await page.getByRole('button',{name:'حفظ التعديلات',exact:true}).click();await page.getByRole('heading',{name:'تعديل بيانات المنتج',exact:true}).waitFor({state:'hidden'});assert.equal(products[0].category,id);
   await page.getByRole('button',{name:'التصنيفات',exact:true}).click();await page.getByRole('article',{name:'تصنيف معدل',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'حذف تصنيف معدل',exact:true}).isDisabled());
  });
  await t.test('popup closes with Escape, reloads and fits mobile',async()=>{
   await page.reload();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a',exact:true}).click();await page.getByRole('dialog').waitFor();
   await page.screenshot({path:join(directory,'categories-popup-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const bounds=await page.getByRole('dialog').boundingBox();assert.ok(bounds.width<=390&&bounds.height<=844);
   await page.screenshot({path:join(directory,'categories-popup-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
   await page.getByRole('button',{name:'\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a',exact:true}).click();await go('/sales');await page.getByRole('button',{name:'\u062a\u0635\u0646\u064a\u0641 \u0645\u0631\u062a\u0628\u0637',exact:true}).waitFor();const saleCategories=await page.locator('.retail-cashier-products .scrollbar-none button').allTextContents();assert.equal(saleCategories[1],'\u062a\u0635\u0646\u064a\u0641 \u0645\u0631\u062a\u0628\u0637');
  });
  await t.test('read-only catalog users can view categories but cannot edit',async()=>{
   user.permissions=['organization.read','catalog.read'];await page.goto(config.origin+'/inventory?tab=categories');await page.getByRole('article',{name:'تصنيف معدل',exact:true}).waitFor();assert.equal(await page.getByLabel('اسم التصنيف',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'تعديل تصنيف معدل',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'حذف تصنيف معدل',exact:true}).count(),0);
  });
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.ok(writes.every(({path})=>path.startsWith('/api/categories')||path==='/api/products/p1'));
 }finally{await browser.close();}
});
