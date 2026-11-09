import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {renderPrintJob} from '../render-print.mjs';
import {spoolImages} from '../windows-printing.mjs';
import {receiptPreviewJob} from '../../shared/receiptDesign.js';

test('Microsoft Print to PDF creates a downloadable receipt PDF at the selected paper width without a Windows print prompt',async()=>{
 for(const width of [58,80]){
  const copies=width===58?1:2,id=randomUUID(),directory=resolve('.developer/printing-tests/pdf',id),job={...receiptPreviewJob({storeName:'PDF Test',currency:'SAR'},width+'mm'),id};
  const pages=await renderPrintJob(job,{chrome:'C:/Program Files/Google/Chrome/Application/chrome.exe',directory:join(directory,'render')});
  const result=await spoolImages('Microsoft Print to PDF',pages,id,{directory,copies,enumerate:async()=>[{Name:'Microsoft Print to PDF',isVirtual:true}]});assert.equal(result.pdf,true);
  const data=await readFile(join(directory,'pdf',id+'.pdf')),raw=data.toString('latin1');assert.equal(data.subarray(0,5).toString(),'%PDF-');assert.ok(data.length>1000);assert.equal([...raw.matchAll(/\/Type\s*\/Page\b/g)].length,copies);
  const box=raw.match(/\/MediaBox\s*\[0 0 ([\d.]+)/);assert.ok(box);assert.ok(Math.abs(Number(box[1])-width*72/25.4)<1);
 }
});
