import test from 'node:test';import assert from 'node:assert/strict';import {rebaseJSON,rebaseRow} from './currency-rebase-lib.mjs';
test('one-to-one rebase changes currency metadata while preserving amounts, IDs and free text',()=>{
 const row={id:'same',currency:'SAR',total:'123.45',snapshot:{currency:'SAR',baseCurrency:'SAR',exchangeRate:'1',total:'123.45',note:'SAR',items:[{currency:'SAR',name:'SAR',quantity:'2',price:'10.00'}]}};
 const converted=rebaseRow('commercial_documents',row,'SAR','EGP');assert.equal(converted.currency,'EGP');assert.equal(converted.snapshot.baseCurrency,'EGP');assert.equal(converted.snapshot.items[0].currency,'EGP');assert.equal(converted.total,row.total);assert.equal(converted.id,row.id);assert.equal(converted.snapshot.note,'SAR');assert.equal(converted.snapshot.items[0].name,'SAR');assert.equal(row.currency,'SAR');
 assert.deepEqual(rebaseJSON({expected:{SAR:'10',USD:'2'},counted:{SAR:'10'},differences:{SAR:'0'}},'SAR','EGP'),{expected:{EGP:'10',USD:'2'},counted:{EGP:'10'},differences:{EGP:'0'}});
 assert.throws(()=>rebaseJSON({expected:{SAR:'10',EGP:'20'}},'SAR','EGP'),/collision/);
});
