import test from 'node:test';
import assert from 'node:assert/strict';
import {isVirtualPrinter,spoolImages} from '../windows-printing.mjs';

test('silent thermal printing rejects virtual, missing and offline queues before starting Windows printing',async()=>{
 for(const name of ['Microsoft Print to PDF','Microsoft XPS Document Writer','OneNote (Desktop)','Fax','AnyDesk Printer'])assert.equal(isVirtualPrinter(name),true);
 assert.equal(isVirtualPrinter('SII RP-D10'),false);
 for(const items of [[],[{Name:'Synthetic Thermal',offline:true}],[{Name:'Synthetic Thermal',isVirtual:true}]]){
  await assert.rejects(spoolImages('Synthetic Thermal',[],crypto.randomUUID(),{directory:'unused',enumerate:async()=>items}),error=>error.printDelivery==='not_sent');
 }
});
