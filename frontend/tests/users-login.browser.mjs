import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {settings,privateDir} from '../../developer/common.mjs';
const ids={admin:'11111111-1111-4111-8111-111111111111',cashier:'22222222-2222-4222-8222-222222222222',role:'33333333-3333-4333-8333-333333333333',branch:'44444444-4444-4444-8444-444444444444',warehouse:'55555555-5555-4555-8555-555555555555',newUser:'66666666-6666-4666-8666-666666666666'};
const allPermissions=['organization.read','users.read','users.manage','roles.read','roles.manage','catalog.read','sales.read','sales.post'];
const roles=[{id:ids.role,name:'Cashier',is_admin:false,permissions:['catalog.read','sales.read','sales.post']}];
const actor={id:ids.admin,name:'مدير تجريبي',companyId:'77777777-7777-4777-8777-777777777777',roles:[{is_admin:true}],permissions:allPermissions,branches:[ids.branch],warehouses:[ids.warehouse]};
const organization={company:{name:'متجر التجربة',base_currency:'SAR'},branches:[{id:ids.branch,name:'الفرع الرئيسي'}],warehouses:[{id:ids.warehouse,branch_id:ids.branch,name:'المخزن الرئيسي'}],currencies:[{code:'SAR',rate:1,decimals:2}],taxes:[],categories:[]};

test('restaurant-style user management and selector login use server accounts without live writes',async t=>{
 const config=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],writes=[],logins=[],saves=[];
 let signedIn=false,failLogin=false;
 const entries=[{id:ids.cashier,name:'كاشير تجريبي',phone:'01000000000',active:true,roles,roleIds:[ids.role],permissions:roles[0].permissions,branches:[ids.branch],warehouses:[ids.warehouse]}];
 const directory=join(privateDir,'ui-review','users-login');await mkdir(directory,{recursive:true});
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,body=request.postDataJSON();
  if(path==='/api/offline-activation/status')return route.fulfill({json:{status:'ACTIVE',activated:true,product:'retail',setupRequired:false}});
  if(path==='/api/auth/me')return route.fulfill(signedIn?{json:{user:actor,csrfToken:'mock-csrf'}}:{status:401,json:{error:{code:'AUTH_REQUIRED',message:'Sign in'}}});
  if(path==='/api/auth/accounts')return route.fulfill({json:{items:[{id:ids.admin,name:actor.name,isAdmin:true},{id:ids.cashier,name:entries[0].name,isAdmin:false}],branding:{name:organization.company.name}}});
  if(path==='/api/auth/login'){logins.push(body);if(failLogin)return route.fulfill({status:401,json:{error:{code:'INVALID_CREDENTIALS',message:'رمز غير صحيح'}}});signedIn=true;return route.fulfill({json:{user:actor,csrfToken:'mock-csrf'}});}
  if(path==='/api/auth/logout'){signedIn=false;return route.fulfill({json:{loggedOut:true}});}
  if(path==='/api/organization')return route.fulfill({json:organization});
  if(path==='/api/modules')return route.fulfill({json:{items:[]}});
  if(path==='/api/roles')return route.fulfill({json:{items:roles,permissions:allPermissions}});
  if(path==='/api/users'&&request.method()==='GET'){const q=url.searchParams.get('q')||'',items=entries.filter(row=>row.name.includes(q)||row.phone.includes(q));return route.fulfill({json:{items,total:items.length,page:1,limit:50}});}
  if(path.startsWith('/api/users/')&&request.method()==='GET'){const row=entries.find(row=>row.id===path.split('/').at(-1));return row?route.fulfill({json:row}):route.fulfill({status:404,json:{error:{message:'Not found'}}});}
  if((path==='/api/users'&&request.method()==='POST')||(path.startsWith('/api/users/')&&request.method()==='PUT')){saves.push({path,body});assert.equal(body.username,undefined);const id=request.method()==='POST'?ids.newUser:path.split('/').at(-1),row={...body,id,roles,permissions:roles[0].permissions};delete row.password;const at=entries.findIndex(value=>value.id===id);if(at<0)entries.push(row);else entries[at]=row;return route.fulfill({json:{id,name:body.name,active:body.active}});}
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes.push(path);return route.abort();}
  writes.push('Unexpected GET '+path);return route.abort();
 });
 const go=async path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
 try{
  await t.test('names selector, numeric keypad and failed login',async()=>{
   await page.goto(config.origin+'/users');await page.getByRole('button',{name:actor.name,exact:true}).waitFor();assert.equal(await page.locator('input[name=username]').count(),0);
   await page.screenshot({path:join(directory,'login-desktop.png'),fullPage:true});
   await page.getByRole('button',{name:'كاشير تجريبي',exact:true}).click();assert.equal(await page.getByRole('button',{name:'نسيت رمز الأدمن؟',exact:true}).count(),0);
   await page.getByRole('button',{name:'1',exact:true}).click();await page.getByRole('button',{name:'2',exact:true}).click();assert.equal(await page.getByLabel('الرمز السري',{exact:true}).inputValue(),'12');
   await page.getByRole('button',{name:'حذف آخر حرف',exact:true}).click();assert.equal(await page.getByLabel('الرمز السري',{exact:true}).inputValue(),'1');
   failLogin=true;await page.getByRole('button',{name:'دخول',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('الرمز السري',{exact:true}).inputValue(),'');assert.deepEqual(logins[0],{userId:ids.cashier,password:'1'});
   await page.getByRole('button',{name:actor.name,exact:true}).click();await page.getByRole('button',{name:'نسيت رمز الأدمن؟',exact:true}).waitFor();
   await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(directory,'login-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
   await page.getByRole('button',{name:'English',exact:true}).click();await page.getByText('Choose user',{exact:true}).waitFor();assert.equal(await page.locator('.retail-local-login').getAttribute('dir'),'ltr');await page.getByRole('button',{name:'Dark',exact:true}).click();assert.equal(await page.locator('.retail-local-login').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(17, 28, 43)');await page.getByRole('button',{name:'Light',exact:true}).click();await page.getByRole('button',{name:'العربية',exact:true}).click();
   failLogin=false;await page.getByLabel('الرمز السري',{exact:true}).fill('7');await page.getByLabel('الرمز السري',{exact:true}).press('Enter');
   await page.getByRole('heading',{name:'إدارة صلاحيات المستخدمين',exact:true}).waitFor();assert.deepEqual(logins[1],{userId:ids.admin,password:'7'});
  });
  await t.test('existing account details remain editable after repeated selection; blank password is preserved',async()=>{
   await page.getByLabel('الاسم',{exact:true}).waitFor();assert.equal(await page.getByLabel('رقم الهاتف',{exact:true}).inputValue(),'01000000000');
   await page.getByRole('button',{name:/كاشير تجريبي Cashier/}).click();assert.equal(await page.getByLabel('الاسم',{exact:true}).inputValue(),'كاشير تجريبي');
   assert.equal(await page.getByLabel('كلمة السر',{exact:true}).inputValue(),'');assert.ok(await page.getByLabel('sales.post',{exact:true}).isDisabled());
   await page.getByLabel('رقم الهاتف',{exact:true}).fill('01000000001');await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();await page.getByText('تم حفظ بيانات المستخدم',{exact:true}).waitFor();assert.equal(saves[0].body.password,undefined);assert.equal(saves[0].body.phone,'01000000001');await page.screenshot({path:join(directory,'users-desktop.png'),fullPage:true});
  });
  await t.test('new cashier requires no username and accepts a short local passcode',async()=>{
   await page.getByRole('button',{name:'جديد',exact:true}).click();await page.getByLabel('الاسم',{exact:true}).fill('موظف جديد');await page.getByLabel('رقم الهاتف',{exact:true}).fill('01000000002');await page.getByLabel('كلمة السر',{exact:true}).fill('8');await page.getByRole('button',{name:'إضافة مستخدم',exact:true}).click();await page.getByText('تم حفظ بيانات المستخدم',{exact:true}).waitFor();assert.equal(saves[1].body.password,'8');assert.equal(saves[1].path,'/api/users');
   await page.getByRole('button',{name:/موظف جديد Cashier/}).waitFor();
   await page.getByLabel('بحث عن مستخدم',{exact:true}).fill('غير موجود');await page.getByText('لا توجد حسابات مطابقة',{exact:true}).waitFor();await page.getByLabel('بحث عن مستخدم',{exact:true}).fill('');await page.getByRole('button',{name:/موظف جديد Cashier/}).waitFor();
  });
  await t.test('roles tab, mobile width and dark palette',async()=>{
   await page.getByRole('button',{name:'تعديل صلاحيات الأدوار',exact:true}).click();await page.getByRole('heading',{name:'الأدوار',exact:true}).waitFor();assert.ok(page.url().includes('tab=roles'));await go('/users');await page.getByLabel('الاسم',{exact:true}).waitFor();
   await page.getByRole('button',{name:'داكن',exact:true}).click();assert.equal(await page.locator('.retail-users').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(17, 28, 43)');await page.screenshot({path:join(directory,'users-dark.png'),fullPage:true});await page.getByRole('button',{name:'فاتح',exact:true}).click();
   await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(directory,'users-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
   const showMenu=page.getByRole('button',{name:'إظهار القائمة الجانبية',exact:true});if(await showMenu.count())await showMenu.click();
   await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('heading',{name:'User access management',exact:true}).waitFor();assert.equal(await page.locator('.retail-users').getAttribute('dir'),'ltr');await page.getByRole('button',{name:'العربية',exact:true}).click();
  });
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(saves.length,2);
 }finally{await browser.close();}
});
