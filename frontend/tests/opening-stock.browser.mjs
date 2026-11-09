import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {settings} from '../../developer/common.mjs';
test('new product opening balance accepts decimals and existing balance remains protected',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage(),errors=[],unexpected=[];let products=[],creates=0;
 const user={id:'11111111-1111-4111-8111-111111111111',name:'Test',companyId:'22222222-2222-4222-8222-222222222222',permissions:['catalog.read','catalog.create','catalog.update','stock.post','organization.read'],roles:[{is_admin:true}],branches:['33333333-3333-4333-8333-333333333333'],warehouses:['44444444-4444-4444-8444-444444444444']};
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>{const r=route.request(),path=new URL(r.url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{user,csrfToken:'mock'}});
  if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail'}});
  if(path==='/api/organization')return route.fulfill({json:{company:{name:'Test',base_currency:'SAR'},categories:[],branches:[{id:user.branches[0],name:'Main'}],warehouses:[{id:user.warehouses[0],name:'Main',branch_id:user.branches[0]}],currencies:[{code:'SAR',rate:1}],taxes:[]}});
  if(path==='/api/modules')return route.fulfill({json:{items:[]}});
  if(path==='/api/products'&&r.method()==='GET')return route.fulfill({json:{items:products,total:products.length}});
  if(path==='/api/products'&&r.method()==='POST'){const body=r.postDataJSON();assert.equal(body.stock,0);assert.deepEqual(body.openingBalances,[{variantId:'',quantity:2.5}]);assert.equal(body.costPrice,3);creates++;const {openingBalances,...product}=body;products=[{...product,version:1,stock:openingBalances[0].quantity}];return route.fulfill({status:201,json:products[0]});}
  unexpected.push(r.method()+' '+path);return route.abort();
 });
 try{await page.goto(cfg.origin+'/inventory');await page.getByRole('button',{name:'إضافة منتج جديد',exact:true}).click();const stock=page.getByLabel('الرصيد الافتتاحي',{exact:true});assert.equal(await stock.isDisabled(),false);await stock.fill('17');assert.equal(await stock.inputValue(),'17');await stock.fill('2.5');assert.equal(await stock.evaluate(node=>node.checkValidity()),false);await page.getByLabel('السماح بالكميات الكسرية',{exact:true}).check();assert.equal(await stock.evaluate(node=>node.checkValidity()),true);await page.getByPlaceholder('مثال: حليب كامل الدسم 1 لتر',{exact:true}).fill('Opening mock');await page.getByLabel('سعر البيع',{exact:true}).fill('5');await page.getByLabel('سعر التكلفة',{exact:true}).fill('3');await page.getByRole('button',{name:'إضافة المنتج',exact:true}).click();await page.getByRole('heading',{name:'إضافة منتج جديد',exact:true}).waitFor({state:'hidden'});assert.equal(creates,1);await page.getByTitle('تعديل بيانات المنتج',{exact:true}).last().click();assert.equal(await stock.inputValue(),'2.5');assert.equal(await stock.isDisabled(),true);assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);}finally{await browser.close();}
});
