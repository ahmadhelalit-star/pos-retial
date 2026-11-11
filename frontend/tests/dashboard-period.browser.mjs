import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {settings,privateDir} from '../../developer/common.mjs';

test('dashboard date and time controls filter every panel and remember the last valid period',async()=>{
  const config=await settings(),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'UTC'}),queries=[],unexpected=[],errors=[];
  const user={id:crypto.randomUUID(),companyId:crypto.randomUUID(),name:'مدير الاختبار',permissions:['organization.read','reports.read'],roles:[{is_admin:true}],branches:[],warehouses:[]};
  const organization={company:{name:'متجر الاختبار',base_currency:'EGP'},categories:[],branches:[],warehouses:[],currencies:[],taxes:[]};
  await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));page.on('pageerror',error=>errors.push(error.message));
  await page.context().route('**/api/**',route=>{
    const request=route.request(),url=new URL(request.url()),reply=json=>route.fulfill({json});
    if(request.method()!=='GET'){unexpected.push(request.method()+' '+url.pathname);return route.abort();}
    if(url.pathname==='/api/auth/me')return reply({user,csrfToken:'fixture'});
    if(url.pathname==='/api/offline-activation/status')return reply({status:'ACTIVE',activated:true,product:'retail',features:{}});
    if(url.pathname==='/api/organization')return reply(organization);
    if(url.pathname==='/api/modules')return reply({items:[]});
    if(url.pathname==='/api/reports/basic'){
      const params=Object.fromEntries(url.searchParams);queries.push(params);assert.equal(params.trend,'1');
      const historical=params.from.startsWith('2026-11-01'),amount=historical?480:120,product=historical?'منتج الفترة السابقة':'منتج اليوم';
      return reply({baseCurrency:'EGP',decimals:2,documents:[{kind:'sale',count:2,total_base:amount}],accounts:[{kind:"customer",accounts:1,due_base:historical?760:150,credit_base:25}],summary:{purchasesBase:historical?610:220,salesBase:amount,grossProfitBase:40,salesTaxBase:10},payments:[{direction:'in',method:'card',amount_base:amount},{direction:'out',method:'cash',amount_base:999}],dashboard:{granularity:historical?'day':'hour',trend:[{bucket:historical?'2026-11-01T00:00':'2026-11-11T12:00',sales:amount,profit:40}],topProducts:[{id:'p',name:product,quantity:2,revenue:amount,profit:40}],categorySales:[{name:historical?'تصنيف سابق':'تصنيف اليوم',amount}],lowStockProducts:[{id:'l',name:'رصيد منخفض',stock:2,unit:'قطعة'}]}});
    }
    unexpected.push(request.method()+' '+url.pathname);return route.abort();
  });
  try{
    const fromDate=page.getByLabel('من تاريخ',{exact:true}),toDate=page.getByLabel('إلى تاريخ',{exact:true}),fromTime=page.getByLabel('من وقت',{exact:true}),toTime=page.getByLabel('إلى وقت',{exact:true});
    await page.goto(config.origin+'/dashboard');await page.getByText('منتج اليوم',{exact:true}).waitFor();
    assert.equal(await fromDate.inputValue(),'2026-11-11');assert.equal(await toDate.inputValue(),'2026-11-11');
    assert.deepEqual(queries.at(-1),{from:'2026-11-10T22:00:00.000Z',to:'2026-11-11T22:00:00.000Z',trend:'1'});
    await fromDate.fill('2026-11-01');await fromTime.fill('10:00');await toTime.fill('11:17');
    await page.getByText('منتج الفترة السابقة',{exact:true}).waitFor();assert.deepEqual(queries.at(-1),{from:'2026-11-01T08:00:00.000Z',to:'2026-11-11T09:18:00.000Z',trend:'1'});
    assert.match(await page.locator('.dashboard-kpi').first().innerText(),/٤٨٠/);assert.match(await page.locator('.dashboard-trend-point').filter({has:page.locator('[style*="height: 100%"]')}).first().getAttribute('aria-label'),/٤٨٠/);
    const balances=page.locator('.dashboard-panel').filter({has:page.getByRole('heading',{name:'أرصدة الحسابات',exact:true})});
    assert.match(await balances.innerText(),/٧٦٠/);
    assert.match(await page.locator('.dashboard-kpi').filter({hasText:'صافي المشتريات'}).innerText(),/٦١٠/);
    assert.equal(await page.getByRole('link',{name:'التقارير التفصيلية',exact:true}).count(),0);
    await page.goto(config.origin+'/reports');await page.waitForURL('**/dashboard');
    await page.getByText('منتج الفترة السابقة',{exact:true}).waitFor();
    const count=queries.length;await fromDate.fill('2026-11-20');await page.getByRole('alert').waitFor();await page.waitForTimeout(300);assert.equal(queries.length,count);await page.getByText('منتج الفترة السابقة',{exact:true}).waitFor();
    await page.reload();await page.getByText('منتج الفترة السابقة',{exact:true}).waitFor();assert.equal(await fromDate.inputValue(),'2026-11-01');assert.equal(await toTime.inputValue(),'11:17');
    await page.getByRole('button',{name:'اليوم',exact:true}).click();await page.getByText('منتج اليوم',{exact:true}).waitFor();assert.equal(await fromTime.inputValue(),'00:00');assert.equal(await toTime.inputValue(),'23:59');
    const folder=join(privateDir,'ui-review','dashboard');await mkdir(folder,{recursive:true});await page.screenshot({path:join(folder,'desktop.png'),fullPage:true});
    const show=page.getByRole('button',{name:'إظهار القائمة الجانبية',exact:true});if(await show.isVisible())await show.click();await page.getByRole('button',{name:'داكن',exact:true}).click();
    await page.getByRole('button',{name:'English',exact:true}).click();await page.getByLabel('From date',{exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
    await page.getByRole('button',{name:'العربية',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
    assert.ok(await page.locator('.dashboard-period').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:join(folder,'mobile-dark.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  }finally{await browser.close();}
});
