import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {settings,privateDir} from '../../developer/common.mjs';

test('restaurant-style shifts preserve Retail opening, multi-currency closing, retry keys, reports and access controls',async()=>{
  const config=await settings(),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],unexpected=[],writes=[],device='fixture-terminal',branch=crypto.randomUUID(),cashbox=crypto.randomUUID(),shiftId=crypto.randomUUID();let failClose=true;
  const user={id:crypto.randomUUID(),companyId:crypto.randomUUID(),name:'مدير الاختبار',permissions:['organization.read','organization.manage','shifts.read','shifts.open','shifts.close','shifts.manage','printing.create'],roles:[{is_admin:true}],branches:[branch],warehouses:[]};
  const organization={company:{name:'متجر الاختبار',base_currency:'EGP'},currencies:[{code:'EGP',decimals:2},{code:'USD',decimals:2}],branches:[{id:branch,name:'الفرع الرئيسي'}],warehouses:[],taxes:[],categories:[]};
  const cashboxes=[{id:cashbox,name:'درج الكاشير',branch_id:branch}],items=[];
  const report=()=>({shift:{...items.find(row=>row.id===shiftId)},expected:{EGP:135,USD:2},expectedBase:235,methods:[{method:'cash',direction:'in',currency:'EGP',amount:50},{method:'cash',direction:'out',currency:'EGP',amount:15},{method:'card',direction:'in',currency:'EGP',amount:400},{method:'cash',direction:'in',currency:'USD',amount:2}],sales:[{kind:'sale',count:3,total:550},{kind:'sale_return',count:1,total:15}]});
  await page.addInitScript(value=>localStorage.setItem('retail:terminal',value),device);page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('**/api/**',route=>{
    const request=route.request(),path=new URL(request.url()).pathname,reply=json=>route.fulfill({json});
    if(request.method()!=='GET'){assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');assert.ok(request.headers()['idempotency-key']);writes.push({path,body:request.postDataJSON(),key:request.headers()['idempotency-key']});}
    if(path==='/api/auth/me')return reply({user,csrfToken:'fixture-csrf'});
    if(path==='/api/offline-activation/status')return reply({status:'ACTIVE',activated:true,product:'retail',features:{}});
    if(path==='/api/organization')return reply(organization);
    if(path==='/api/modules')return reply({items:[]});
    if(path==='/api/organization/presentation')return reply({defaultOpeningFloat:0});
    if(path==='/api/shifts'&&request.method()==='GET')return reply({items,cashboxes});
    if(path==='/api/shifts'&&request.method()==='POST'){
      assert.deepEqual(request.postDataJSON(),{cashboxId:cashbox,deviceId:device,opening:100});
      items.unshift({id:shiftId,user_id:user.id,device_id:device,cashbox_id:cashbox,cashbox_name:'درج الكاشير',opened_at:'2026-11-10T08:00:00Z',closed_at:null,opening:100});return reply({id:shiftId});
    }
    if(path===`/api/shifts/${shiftId}`)return reply(report());
    if(path===`/api/shifts/${shiftId}/close`){
      assert.deepEqual(request.postDataJSON(),{deviceId:device,counted:{EGP:130,USD:2}});
      if(failClose){failClose=false;return route.fulfill({status:503,json:{error:{code:'TEMPORARY',message:'خطأ مؤقت للاختبار'}}});}
      const snapshot={...report(),counted:{EGP:130,USD:2},differences:{EGP:-5,USD:0}};items[0].closed_at='2026-11-10T18:00:00Z';items[0].close_snapshot=snapshot;return reply(snapshot);
    }
    if(path===`/api/shifts/${shiftId}/reopen`){assert.deepEqual(request.postDataJSON(),{reason:'مراجعة الجرد'});items[0].closed_at=null;return reply({reopened:true});}
    if(path==='/api/print-jobs'&&request.method()==='POST'){assert.deepEqual(request.postDataJSON(),{shiftId,kind:'shift_report',format:'80mm'});return reply({id:'fixture-print'});}
    if(path==='/api/print-jobs/fixture-print')return reply({id:'fixture-print',html:'<html><body>Fixture shift report</body></html>'});
    if(path.startsWith('/api/local/'))return reply({available:false,printers:[],configured:false});
    unexpected.push(request.method()+' '+path);return route.abort();
  });
  const directory=join(privateDir,'ui-review','shifts');await mkdir(directory,{recursive:true});
  try{
    await page.goto(config.origin+'/shift');await page.getByRole('heading',{name:'لا توجد وردية مفتوحة',exact:true}).waitFor();assert.equal(writes.length,0);
    await page.screenshot({path:join(directory,'opening.png'),fullPage:true});await page.getByLabel(/رصيد بداية الوردية/).fill('100');await page.getByRole('button',{name:'فتح الوردية',exact:true}).click();await page.getByRole('heading',{name:'الوردية مفتوحة',exact:true}).waitFor();
    const metric=label=>page.locator('.shift-metric').filter({has:page.getByText(label,{exact:true})});
    assert.match(await metric('عدد فواتير البيع').innerText(),/3/);assert.match(await metric('النقد المتوقع بالقيمة الأساسية').innerText(),/٢٣٥/);assert.equal(await page.locator('.shift-payment-row').count(),4);
    await page.screenshot({path:join(directory,'current.png'),fullPage:true});
    await page.getByRole('button',{name:'إغلاق الوردية',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.getByLabel('النقد المعدود EGP',{exact:true}).fill('130');await dialog.getByLabel('النقد المعدود USD',{exact:true}).fill('2');await dialog.getByRole('button',{name:'مراجعة مبلغ الإغلاق',exact:true}).click();assert.equal(writes.filter(row=>row.path.endsWith('/close')).length,0);
    await dialog.getByRole('button',{name:'إغلاق النافذة',exact:true}).click();assert.equal(writes.length,1);
    await page.getByRole('button',{name:'إغلاق الوردية',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('النقد المعدود EGP',{exact:true}).fill('130');await dialog.getByLabel('النقد المعدود USD',{exact:true}).fill('2');await dialog.getByRole('button',{name:'مراجعة مبلغ الإغلاق',exact:true}).click();await page.screenshot({path:join(directory,'close-confirm.png'),fullPage:true});
    await dialog.getByRole('button',{name:'تأكيد الإغلاق',exact:true}).click();await dialog.getByRole('alert').waitFor();await dialog.getByRole('button',{name:'تأكيد الإغلاق',exact:true}).click();await page.getByRole('heading',{name:'تم إغلاق الوردية',exact:true}).waitFor();
    const closes=writes.filter(row=>row.path.endsWith('/close'));assert.equal(closes.length,2);assert.equal(closes[0].key,closes[1].key);
    await page.getByRole('button',{name:'آخر الورديات المغلقة',exact:true}).click();await page.getByRole('button',{name:'عرض التقرير',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByText('وردية مغلقة',{exact:true}).waitFor();await dialog.locator('summary').filter({hasText:'المعاينة وأحجام الورق الأخرى'}).click();await dialog.getByRole('button',{name:'تجهيز معاينة الطباعة',exact:true}).click();await dialog.locator('iframe').waitFor();
    await dialog.getByLabel('سبب إعادة الفتح',{exact:true}).fill('مراجعة الجرد');await dialog.getByRole('button',{name:'إعادة فتح الوردية',exact:true}).click();await page.getByRole('heading',{name:'الوردية مفتوحة',exact:true}).waitFor();
    await page.getByRole('button',{name:'إظهار القائمة الجانبية',exact:true}).click();await page.getByRole('button',{name:'داكن',exact:true}).click();await page.screenshot({path:join(directory,'current-dark.png'),fullPage:true});await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('heading',{name:'Current shift',exact:true}).waitFor();await page.getByRole('button',{name:'العربية',exact:true}).click();
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.screenshot({path:join(directory,'current-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    user.permissions=['organization.read','shifts.read'];await page.reload();await page.getByRole('heading',{name:'الوردية مفتوحة',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'إغلاق الوردية',exact:true}).count(),0);assert.equal(await page.getByText('إضافة صندوق نقدية',{exact:true}).count(),0);
    items[0].closed_at='2026-11-10T18:00:00Z';await page.reload();await page.getByRole('heading',{name:'لا توجد وردية مفتوحة',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'فتح الوردية',exact:true}).count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  }catch(error){console.error({errors,unexpected,screen:(await page.locator('body').innerText()).slice(-1800)});throw error;}finally{await browser.close();}
});
