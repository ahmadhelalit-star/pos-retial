import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '../../backend/node_modules/playwright-core/index.mjs';
import {renderPrintHTML} from '../../backend/src/modules/printing.service.js';

test('58 and 80 mm receipts keep amounts and quantities on one line within the printable area',async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [58,80])for(const presentation of [{},{fontScalePercent:140,receiptFontFamily:'Tahoma',receiptBold:true,receiptMarginMm:8}]){
  const page=await browser.newPage({viewport:{width:Math.ceil(width*96/25.4),height:700}});
  await page.setContent(renderPrintHTML({kind:'receipt',format:width+'mm',payload:{number:'SYNTHETIC',presentation,items:[{name:'منتج اختباري باسم طويل يحتاج إلى التفاف',unit:'قطعة',quantity:'2.5',total:'1234.56'}],total:'1234.56',currency:'SAR'}}));
  const layout=await page.evaluate(()=>{const table=document.querySelector('table').getBoundingClientRect();return {table:{left:table.left,right:table.right},viewport:innerWidth,cells:[...document.querySelectorAll('td')].slice(1).map(cell=>{const range=document.createRange();range.selectNodeContents(cell);const text=range.getBoundingClientRect(),box=cell.getBoundingClientRect();return {textWidth:text.width,cellWidth:box.width,lines:range.getClientRects().length};})};});
  assert.ok(layout.table.left>=0&&layout.table.right<=layout.viewport);for(const cell of layout.cells){assert.equal(cell.lines,1);assert.ok(cell.textWidth<cell.cellWidth);}await page.close();
 }}finally{await browser.close();}
});
