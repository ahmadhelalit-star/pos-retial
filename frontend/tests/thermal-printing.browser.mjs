import {receiptDesignDefaults} from '../../shared/receiptDesign.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {settings,privateDir} from '../../developer/common.mjs';

async function exercisePDFSelection(page,tests){
 await page.setViewportSize({width:1440,height:1000});await page.getByLabel('طابعة البون',{exact:true}).selectOption('Microsoft Print to PDF');await page.getByRole('button',{name:'حفظ إعدادات الطابعة',exact:true}).click();await page.getByText('تم حفظ إعدادات طابعة البون.',{exact:true}).waitFor();
 await Promise.all([page.waitForResponse(response=>response.url().endsWith('/api/local/test')),page.getByRole('button',{name:'طباعة بون اختبار',exact:true}).click()]);assert.equal(tests.length,3);
 await page.getByRole('button',{name:'سجل الطباعة',exact:true}).click();await page.getByText('ملف PDF جاهز',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'تنزيل ملف PDF',exact:true}).getAttribute('href'),`/api/local/print/${tests[2]}/pdf`);
}

async function exerciseReceiptDesigner(page,directory){
 await page.getByRole('heading',{name:'إعدادات شكل الفاتورة',exact:true}).waitFor();
 assert.equal(await page.getByText('بون المطبخ',{exact:true}).count(),0);assert.equal(await page.getByRole('switch',{name:/QR|ولاء/}).count(),0);
 await page.getByRole('button',{name:'زيادة حجم الخط العام',exact:true}).click();await page.getByRole('button',{name:'زيادة حجم الخط العام',exact:true}).click();await page.getByLabel('نوع الخط',{exact:true}).selectOption('Tahoma');await page.getByRole('switch',{name:'خط عريض للبون',exact:true}).check();
 await page.getByText('تغييرات غير محفوظة',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'طباعة تجريبية',exact:true}).isDisabled());
 await page.getByRole('button',{name:'الطابعات',exact:true}).click();await page.getByRole('button',{name:'تصميم البون ومعاينته',exact:true}).click();await page.getByText('تغييرات غير محفوظة',{exact:true}).waitFor();assert.equal(await page.getByLabel('حجم الخط العام',{exact:true}).textContent(),'120%');
 const frame=page.frameLocator('iframe[title="معاينة البون"]');await frame.locator('body').waitFor();assert.ok((await frame.locator('body').evaluate(node=>getComputedStyle(node).fontFamily)).includes('Tahoma'));assert.equal(await frame.locator('body').evaluate(node=>getComputedStyle(node).fontSize),'14.4px');
 await page.getByRole('button',{name:'حفظ تصميم البون',exact:true}).click();await page.getByText('محفوظ',{exact:true}).waitFor();await page.screenshot({path:join(directory,'receipt-designer-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'زيادة حجم الخط العام',exact:true}).click();await page.getByRole('button',{name:'تراجع عن التعديلات',exact:true}).click();assert.equal(await page.getByLabel('حجم الخط العام',{exact:true}).textContent(),'120%');
 await page.getByRole('button',{name:'داكن',exact:true}).click();await page.screenshot({path:join(directory,'receipt-designer-dark.png'),fullPage:true});await page.getByRole('button',{name:'فاتح',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(directory,'receipt-designer-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
}

test('thermal settings persist, exclude virtual printers and test silently only after an explicit click',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],unexpected=[],tests=[],saves=[],pdfIds=new Set();
 let presentation={...receiptDesignDefaults,storeName:'Sample Store',companyName:'',branchName:'',taxNumber:'',commercialRegister:'',phone:'',mobile:'',email:'',address:'',logoEmoji:'',receiptTitle:'Receipt',receiptPaperWidth:'80mm',headerMessage:'',footerMessage:'Thanks',showTaxNumber:true,showCashierName:true,showCustomerInfo:true,showTaxBreakdown:true,defaultOpeningFloat:0};
 let thermal={printer:'',enabled:false,paperSize:'80mm',copies:1,autoPrint:false};
 const user={id:crypto.randomUUID(),companyId:crypto.randomUUID(),name:'مدير الاختبار',roles:[{is_admin:true}],permissions:['organization.read','organization.manage','printing.read','printing.create'],branches:[],warehouses:[]};
 await page.addInitScript(()=>{window.print=()=>{throw Error('Browser printing is forbidden in silent mode');};});page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>{const r=route.request(),path=new URL(r.url()).pathname,reply=json=>route.fulfill({json});
  if(path==='/api/auth/me')return reply({user,csrfToken:'mock-csrf'});
  if(path==='/api/offline-activation/status')return reply({status:'ACTIVE',activated:true,product:'retail',features:{}});
  if(path==='/api/organization')return reply({company:{name:'متجر الاختبار',base_currency:'SAR'},categories:[],branches:[],warehouses:[],currencies:[],taxes:[]});
  if(path==='/api/modules')return reply({items:[]});
  if(path==='/api/organization/presentation'){if(r.method()==='PUT'){presentation=r.postDataJSON();assert.equal(presentation.fontScalePercent,120);assert.equal(presentation.receiptFontFamily,'Tahoma');assert.equal(presentation.receiptBold,true);}return reply(presentation);}
  if(path==='/api/local/status')return reply({available:true,terminalId:'terminal-fixture',thermal});
  if(path==='/api/local/printers')return reply({items:[{Name:'Thermal Fixture',PortName:'USB-MOCK',isVirtual:false},{Name:'Microsoft Print to PDF',PortName:'PORTPROMPT:',isVirtual:true}]});
  if(path==='/api/local/print')return reply({items:tests.map(id=>({id,printer:thermal.printer,state:'spooled',output:pdfIds.has(id)?'pdf':undefined}))});
  if(path==='/api/local/thermal'){assert.equal(r.method(),'PUT');assert.equal(r.headers()['x-csrf-token'],'mock-csrf');assert.equal(r.headers()['x-retail-local'],'1');thermal=r.postDataJSON();saves.push(thermal);return reply({saved:true,thermal});}
  if(path==='/api/local/test'){assert.equal(r.method(),'POST');tests.push(r.postDataJSON().id);if(thermal.printer==='Microsoft Print to PDF')pdfIds.add(tests.at(-1));return reply({id:tests.at(-1),state:'spooled'});}
  unexpected.push(r.method()+' '+path);return route.abort();
 });
 try{
  await page.goto(cfg.origin+'/printing');await page.getByRole('heading',{name:'إدارة طابعة البون الحراري',exact:true}).waitFor();
  const printer=page.getByLabel('طابعة البون',{exact:true}),testButton=page.getByRole('button',{name:'طباعة بون اختبار',exact:true});
  await printer.locator('option[value="Thermal Fixture"]').waitFor({state:'attached'});assert.equal(await printer.inputValue(),'');assert.ok(await testButton.isDisabled());assert.equal(await printer.locator('option').filter({hasText:'Microsoft Print to PDF'}).count(),1);assert.equal(tests.length,0);
  await printer.selectOption('Thermal Fixture');await page.getByLabel('مقاس الورق',{exact:true}).selectOption('58mm');await page.getByLabel('عدد النسخ',{exact:true}).fill('2');await page.getByLabel('تفعيل الطباعة الصامتة للبون',{exact:true}).check();assert.ok(await testButton.isDisabled());
  await page.getByRole('button',{name:'حفظ إعدادات الطابعة',exact:true}).click();await page.getByText('تم حفظ إعدادات طابعة البون.',{exact:true}).waitFor();assert.equal(tests.length,0);assert.deepEqual(saves,[{printer:'Thermal Fixture',enabled:true,paperSize:'58mm',copies:2,autoPrint:false}]);
  const directory=join(privateDir,'ui-review','printing');await mkdir(directory,{recursive:true});await page.screenshot({path:join(directory,'settings-desktop.png'),fullPage:true});
  await testButton.click();await page.getByText('أُضيف بون الاختبار إلى طابور الطباعة.',{exact:true}).waitFor();assert.equal(tests.length,1);
  await page.getByRole('button',{name:'تصميم البون ومعاينته',exact:true}).click();
  await exerciseReceiptDesigner(page,directory);
  await page.getByRole('button',{name:'طباعة تجريبية',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('أُضيف'));assert.equal(tests.length,2);
  await page.getByRole('button',{name:'سجل الطباعة',exact:true}).click();await page.getByText('أُرسلت إلى Windows',{exact:true}).first().waitFor();assert.equal(await page.getByText('أُرسلت إلى Windows',{exact:true}).count(),2);
  await page.goto(cfg.origin+'/printing');await printer.waitFor();assert.equal(await printer.inputValue(),'Thermal Fixture');assert.equal(await page.getByLabel('عدد النسخ',{exact:true}).inputValue(),'2');assert.equal(tests.length,2);
  await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('main').getByRole('heading',{name:'Printing settings',exact:true}).waitFor();await page.getByRole('button',{name:'العربية',exact:true}).click();await page.getByRole('button',{name:'داكن',exact:true}).click();await page.screenshot({path:join(directory,'settings-dark.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(directory,'settings-mobile.png'),fullPage:true});await exercisePDFSelection(page,tests);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 }catch(error){console.error({errors,unexpected,body:(await page.locator('body').innerText()).slice(0,1800)});throw error;}finally{await browser.close();}
});

test('invoice prints directly without preview and reuses its job after an ambiguous network reply',async()=>{
 const cfg=await settings(),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage(),errors=[],created=[],enqueued=[];let failed=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__thermal_fixture',route=>route.fulfill({contentType:'text/html',body:'<html><body><div id="fixture"></div></body></html>'}));
 await page.route('**/api/**',route=>{const r=route.request(),path=new URL(r.url()).pathname,reply=json=>route.fulfill({json});
  if(path==='/api/local/status')return reply({terminalId:'terminal-fixture',thermal:{printer:'Thermal Fixture',enabled:true,paperSize:'80mm',copies:1,autoPrint:false}});
  if(path==='/api/print-jobs'){created.push(r.postDataJSON());return reply({id:'11111111-1111-4111-8111-111111111111'});}
  if(path.endsWith('/dispatch')||path.endsWith('/dispatch/report'))return reply({saved:true});
  if(path==='/api/local/print'){enqueued.push(r.postDataJSON().id);if(!failed){failed=true;return route.abort('failed');}return reply({id:enqueued.at(-1),state:'uncertain'});}
  if(path.endsWith('/review'))return reply({id:enqueued.at(-1),state:'confirmed_printed'});
  return route.abort();
 });
 try{
  await page.goto(cfg.origin+'/__thermal_fixture');await page.evaluate(async()=>{const refresh=await import('/@react-refresh');refresh.default.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;window.print=()=>{throw Error('Print dialog forbidden');};const mainSource=await (await fetch('/src/main.jsx')).text(),componentSource=await (await fetch('/src/commercial/SilentReceipt.jsx')).text(),reactUrl=componentSource.match(/from "([^"]+\/react.js[^"]*)"/)[1],domUrl=mainSource.match(/from "([^"]+\/react-dom_client.js[^"]*)"/)[1];const {default:React}=await import(reactUrl),{default:ReactDOM}=await import(domUrl),{SilentReceipt}=await import('/src/commercial/SilentReceipt.jsx'),{createApiClient}=await import('/src/services/apiClient.js');ReactDOM.createRoot(document.querySelector('#fixture')).render(React.createElement(SilentReceipt,{api:createApiClient(),document:{id:'22222222-2222-4222-8222-222222222222',kind:'sale'},auto:true}));});
  const print=page.getByRole('button',{name:'طباعة البون الحراري',exact:true});await print.waitFor();await page.waitForTimeout(250);assert.equal(created.length,0);
  await print.click();await page.getByRole('alert').waitFor();await print.click();await page.getByText('تحقق من الطابعة؛ نتيجة الإرسال غير مؤكدة ولن تتكرر تلقائيًا.',{exact:true}).waitFor();assert.ok(await print.isDisabled());assert.equal(created.length,1);assert.equal(enqueued.length,2);assert.equal(enqueued[0],enqueued[1]);assert.equal(created[0].format,'80mm');
  await page.getByRole('button',{name:'تحققت من خروج البون',exact:true}).click();await page.getByRole('button',{name:'إعادة طباعة البون',exact:true}).waitFor();assert.equal(created.length,1);assert.deepEqual(errors,[]);
 }catch(error){console.error({errors,created,enqueued,body:await page.locator('body').innerText()});throw error;}finally{await browser.close();}
});
