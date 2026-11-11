import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {settings} from '../../developer/common.mjs';

test('inventory stock policy persists, handles failures and respects permissions; cashbox tab is removed',async()=>{
  const config=await settings(),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage(),errors=[],unexpected=[],writes=[];let reject=false;
  const user={id:crypto.randomUUID(),companyId:crypto.randomUUID(),name:'Test admin',permissions:['catalog.read','organization.read','organization.manage'],roles:[{is_admin:true}],branches:[],warehouses:[]};
  const organization={company:{name:'Test store',base_currency:'EGP',allow_negative_stock:false},categories:[],branches:[],warehouses:[],currencies:[],taxes:[]};
  page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('**/api/**',route=>{
    const request=route.request(),path=new URL(request.url()).pathname,reply=json=>route.fulfill({json});
    if(path==='/api/auth/me')return reply({user,csrfToken:'fixture-csrf'});
    if(path==='/api/offline-activation/status')return reply({status:'ACTIVE',activated:true,product:'retail',features:{}});
    if(path==='/api/organization')return reply(organization);
    if(path==='/api/modules')return reply({items:[]});
    if(path==='/api/products')return reply({items:[],total:0});
    if(path==='/api/organization/presentation')return reply({storeName:'Test store',currency:'EGP'});
    if(path==='/api/organization/stock-settings'&&request.method()==='PUT'){
      assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');writes.push(request.postDataJSON());
      if(reject)return route.fulfill({status:403,json:{error:{code:'PERMISSION_DENIED',message:'Fixture access denied'}}});
      organization.company.allow_negative_stock=request.postDataJSON().allowNegativeStock;
      return reply({allowNegativeStock:organization.company.allow_negative_stock});
    }
    unexpected.push(request.method()+' '+path);return route.abort();
  });
  try{
    await page.goto(config.origin+'/inventory');const option=page.getByRole('switch',{name:'السماح بالبيع بالسالب',exact:true});await option.waitFor();
    const switchBox=await option.boundingBox(),addBox=await page.getByRole('button',{name:'إضافة منتج جديد',exact:true}).boundingBox();const toolbarBox=await option.locator('xpath=../../../..').boundingBox();assert.ok(switchBox.x<addBox.x);assert.ok(switchBox.x<toolbarBox.x+toolbarBox.width/2,'inventory actions must be on the left side of the toolbar');assert.ok(Math.abs(switchBox.y+switchBox.height/2-addBox.y-addBox.height/2)<10);
    assert.equal(await option.isChecked(),false);await option.click();await page.waitForFunction(()=>document.querySelector('[role="switch"]')?.disabled===false);assert.equal(organization.company.allow_negative_stock,true);assert.equal(await option.isChecked(),true);
    await page.reload();await option.waitFor();assert.equal(await option.isChecked(),true);
    reject=true;await option.click();await page.getByRole('alert').filter({hasText:'Fixture access denied'}).waitFor();assert.equal(await option.isChecked(),true);
    reject=false;await option.click();await page.waitForFunction(()=>document.querySelector('[role="switch"]')?.disabled===false);assert.equal(organization.company.allow_negative_stock,false);assert.equal(await option.isChecked(),false);
    user.permissions=['catalog.read','organization.read'];await page.reload();await option.waitFor();assert.equal(await option.isDisabled(),true);assert.equal(writes.length,3);
    await page.goto(config.origin+'/settings?tab=pos');await page.getByRole('button',{name:'بيانات المنشأة والمتجر',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'إعدادات الصندوق والدرج',exact:true}).count(),0);
    assert.equal(await page.getByText('عهدة الصندوق الافتراضية لافتتاح الوردية (Opening Float)',{exact:true}).count(),0);
    assert.equal(await page.getByText('تم حفظ إعداد المخزون',{exact:true}).count(),0);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  }finally{await browser.close();}
});
