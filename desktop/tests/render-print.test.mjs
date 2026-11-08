import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { renderPrintJob } from '../render-print.mjs';
test('real Chromium renders receipts, A4, returns, shift reports and barcode label images',async()=>{
  const root=resolve(process.env.TEST_ARTIFACT_DIR??'../work/desktop','render-'+randomUUID()),chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
  for(const [kind,format] of [['receipt','58mm'],['receipt','80mm'],['invoice','A4'],['return','80mm'],['shift_report','A4'],['labels','40x30'],['labels','50x30'],['labels','A4']]){
    const payload=kind==='labels'?{labels:[{name:'اختبار باركود / Synthetic barcode',unit:'قطعة',price:'10.00',currency:'SAR',barcode:'SYNTHETIC-123'},{name:'ملصق ثان',unit:'box',price:'20.00',currency:'SAR',barcode:'SYNTHETIC-456'}]}:{number:'TEST-ONLY-1',createdAt:new Date().toISOString(),kind,items:Array.from({length:kind==='invoice'?70:2},(_,index)=>({name:'صنف صناعي '+index,unit:'piece',quantity:1,total:'10.00'})),total:'20.00',tax:'0.00',discount:'0.00',currency:'SAR',cashier:'Synthetic operator'};
    const pages=await renderPrintJob({id:randomUUID(),kind,format,payload},{chrome,directory:join(root,kind+'-'+format)});assert.ok(pages.length>0);if(kind==='invoice')assert.ok(pages.length>1);if(kind==='labels'&&format!=='A4')assert.equal(pages.length,2);for(const page of pages){const png=await readFile(page.image);assert.equal(png.toString('ascii',1,4),'PNG');assert.ok(png.length>1000);assert.equal(png.readUInt32BE(16),Math.ceil(page.widthMm*96/25.4)*2);}
  }
});
