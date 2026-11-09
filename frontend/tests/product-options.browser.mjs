import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {settings,privateDir} from '../../developer/common.mjs';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
test('product options guide units and variants, undo drafts and protect saved structures',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage(),errors=[],unexpected=[];let products=[],creates=0;
 const user={id:'11111111-1111-4111-8111-111111111111',name:'Test',companyId:'22222222-2222-4222-8222-222222222222',permissions:['catalog.read','catalog.create','catalog.update','stock.post','organization.read'],roles:[{is_admin:true}],branches:['33333333-3333-4333-8333-333333333333'],warehouses:['44444444-4444-4444-8444-444444444444']};
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>{const r=route.request(),path=new URL(r.url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{user,csrfToken:'mock'}});
  if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail'}});
  if(path==='/api/organization')return route.fulfill({json:{company:{name:'Test',base_currency:'SAR'},categories:[],branches:[{id:user.branches[0],name:'Main'}],warehouses:[{id:user.warehouses[0],name:'Main',branch_id:user.branches[0]}],currencies:[{code:'SAR',rate:1}],taxes:[]}});
  if(path==='/api/modules')return route.fulfill({json:{items:[]}});
  if(path==='/api/products'&&r.method()==='GET')return route.fulfill({json:{items:products,total:products.length}});
  if(path==='/api/products'&&r.method()==='POST'){const body=r.postDataJSON();assert.equal(body.stock,0);assert.equal(body.units[1].factor,12);assert.equal(body.units[1].price,25.5);assert.equal(body.attributes[0].name,'Color');assert.deepEqual(body.attributes[0].values,['Black','White']);assert.equal(body.variants.length,1);assert.equal(typeof body.variants[0].price,'number');assert.equal(body.openingBalances[0].quantity,2.5);creates++;const {openingBalances,...product}=body;products=[{...product,version:1,stock:2.5,variants:product.variants.map(row=>({...row,stock:openingBalances.find(entry=>entry.variantId===row.id)?.quantity??0}))}];return route.fulfill({status:201,json:products[0]});}

  unexpected.push(r.method()+' '+path);return route.abort();
 });
 try{
  await page.setViewportSize({width:1280,height:900});await page.goto(cfg.origin+'/inventory');await page.getByRole('button',{name:'إضافة منتج جديد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'إضافة منتج جديد',exact:true});
  await page.getByRole('button',{name:'الألوان والمقاسات',exact:true}).click();assert.equal(await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'+ إضافة خاصية',exact:true}).click();await page.getByRole('button',{name:'إزالة الخاصية',exact:true}).click();assert.equal(await page.getByLabel('اسم الخاصية',{exact:true}).count(),0);
  await page.getByRole('button',{name:'+ إضافة وحدة',exact:true}).click();await page.getByRole('button',{name:'إزالة الوحدة',exact:true}).click();assert.equal(await page.getByLabel('اسم الوحدة',{exact:true}).count(),0);
  await page.getByRole('button',{name:'+ إضافة وحدة',exact:true}).click();await page.getByLabel('اسم الوحدة',{exact:true}).fill('Carton');await page.getByLabel('تحتوي على كم قطعة؟',{exact:true}).fill('12');await page.getByLabel('سعر بيع هذه الوحدة',{exact:true}).fill('25.5');
  await page.getByRole('button',{name:'+ إضافة خاصية',exact:true}).click();await page.getByLabel('اسم الخاصية',{exact:true}).fill('Color');await page.getByLabel('القيم (افصل بفاصلة)',{exact:true}).pressSequentially('Black, White');await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'إزالة الخاصية',exact:true}).click();assert.equal(await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).count(),1);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'إزالة الخاصية',exact:true}).click();assert.equal(await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).count(),0);
  await page.getByRole('button',{name:'البيانات الأساسية',exact:true}).click();await page.getByPlaceholder('مثال: حليب كامل الدسم 1 لتر',{exact:true}).fill('Variant test');await page.getByLabel('سعر البيع',{exact:true}).fill('5');await page.getByLabel('السماح بالكميات الكسرية',{exact:true}).check();
  await page.getByRole('button',{name:'+ إضافة خاصية',exact:true}).click();await page.getByLabel('اسم الخاصية',{exact:true}).fill('Color');await page.getByLabel('القيم (افصل بفاصلة)',{exact:true}).fill('Black, White');await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();await page.getByLabel('Color',{exact:true}).selectOption('Black');await page.getByLabel('الرصيد الافتتاحي للتركيبة',{exact:true}).fill('2.5');
  await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).last().click();assert.equal(await page.getByLabel('Color',{exact:true}).count(),1);
  const directory=join(privateDir,'ui-review','product-options');await mkdir(directory,{recursive:true});await page.screenshot({path:join(directory,'desktop.png'),fullPage:true});
  const save=page.getByRole('button',{name:'إضافة المنتج',exact:true}),bounds=await save.boundingBox();assert.ok(bounds.y+bounds.height<=900);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(directory,'mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});
  await save.click();await dialog.waitFor({state:'hidden'});assert.equal(creates,1);await page.getByTitle('تعديل بيانات المنتج',{exact:true}).last().click();assert.equal(await page.getByRole('button',{name:'إزالة الوحدة',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'إزالة الخاصية',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'+ إضافة تركيبة',exact:true}).click();await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).last().click();assert.equal(await page.getByRole('button',{name:'إزالة التركيبة',exact:true}).count(),1);
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
