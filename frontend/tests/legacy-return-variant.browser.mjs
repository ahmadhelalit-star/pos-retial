import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {settings} from '../../developer/common.mjs';
test('return from a pre-conversion invoice explicitly selects the affected stock variant',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage();let posted=0;const errors=[],unexpected=[],warehouse='44444444-4444-4444-8444-444444444444',invoice='55555555-5555-4555-8555-555555555555';
 const user={id:'11111111-1111-4111-8111-111111111111',companyId:'22222222-2222-4222-8222-222222222222',name:'Test',permissions:['organization.read','purchases.read','purchases.return'],roles:[],branches:['33333333-3333-4333-8333-333333333333'],warehouses:[warehouse]};
 const source={id:invoice,number:'PUR-1',kind:'purchase',warehouseId:warehouse,currency:'SAR',total:'10',tax:'0',discount:'0',items:[{id:'1',productId:'p1',variantId:'',name:'Old product',type:'stock',unit:'قطعة',quantity:2,total:'10',allowFractional:false}]};
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',route=>{const r=route.request(),url=new URL(r.url()),path=url.pathname;
 if(path==='/api/auth/me')return route.fulfill({json:{user,csrfToken:'mock'}});
 if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail'}});
 if(path==='/api/organization')return route.fulfill({json:{company:{name:'Test',base_currency:'SAR'},categories:[],branches:[{id:user.branches[0],name:'Main'}],warehouses:[{id:warehouse,branch_id:user.branches[0],name:'Main'}],currencies:[{code:'SAR',rate:1}],taxes:[]}});
 if(path==='/api/modules'||path==='/api/shifts')return route.fulfill({json:{items:[]}});
 if(path==='/api/purchases')return route.fulfill({json:{items:[{id:invoice,number:source.number,kind:'purchase',created_at:new Date().toISOString(),total:'10',currency:'SAR'}],total:1}});
 if(path==='/api/documents/'+invoice)return route.fulfill({json:source});
 if(path==='/api/products/p1/return-variants'){assert.equal(url.searchParams.get('warehouseId'),warehouse);return route.fulfill({json:{items:[{id:'black',values:{Color:'Black'}},{id:'white',values:{Color:'White'}}]}});}
 if(path===`/api/purchases/${invoice}/returns`){const body=r.postDataJSON();assert.deepEqual(body.items,[{lineId:'1',quantity:1,restock:true,stockVariantId:'white'}]);posted++;return route.fulfill({status:201,json:{id:'mock-return'}});}
 unexpected.push(r.method()+' '+path);return route.abort();
 });try{await page.goto(cfg.origin+'/purchases?tab=history');await page.getByRole('button',{name:'إنشاء مرتجع',exact:true}).last().click();await page.getByLabel('Return quantity 1',{exact:true}).fill('1');await page.getByLabel('Return stock variant 1',{exact:true}).waitFor();await page.getByLabel('Return stock variant 1',{exact:true}).selectOption('white');await page.locator('input[name=reason]').fill('Test return');await page.getByRole('button',{name:'اعتماد المستند العكسي',exact:true}).click();await page.locator('input[name=reason]').waitFor({state:'hidden'});assert.equal(posted,1);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);}finally{await browser.close();}
});
