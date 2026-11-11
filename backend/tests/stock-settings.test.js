import test from 'node:test';
import assert from 'node:assert/strict';
import {saveStockSettings} from '../src/modules/stock-settings.service.js';

const user={companyId:'fixture-company',id:'fixture-user'};
function fixture({exists=true,auditFails=false}={}){
  const calls=[];const db={async query(sql,args){calls.push({sql,args});
    if(sql.startsWith('SELECT'))return {rows:exists?[{allow_negative_stock:false}]:[]};
    if(auditFails&&sql.startsWith('INSERT'))throw Error('audit failed');return {rows:[]};
  },release(){}};return {calls,pool:{connect:async()=>db}};
}
test('stock policy updates only the current company and audits within the same transaction',async()=>{
  for(const allowNegativeStock of [true,false]){
    const {pool,calls}=fixture();assert.deepEqual(await saveStockSettings(pool,user,{allowNegativeStock}),{allowNegativeStock});
    assert.deepEqual(calls.find(call=>call.sql.startsWith('UPDATE')).args,[user.companyId,allowNegativeStock]);
    assert.equal(calls.filter(call=>call.sql.startsWith('UPDATE')).length,1);
    assert.ok(calls.some(call=>call.sql.startsWith('INSERT INTO audit_logs')));
    assert.equal(calls.at(-1).sql,'COMMIT');
    assert.ok(!calls.some(call=>/stock_balances|stock_ledger|commercial_documents/.test(call.sql)));
  }
});
test('stock policy rejects non-booleans and extra company selectors before database access',async()=>{
  for(const input of [{allowNegativeStock:'false'},{allowNegativeStock:1},{},{allowNegativeStock:true,companyId:'another'}]){
    const {pool,calls}=fixture();await assert.rejects(saveStockSettings(pool,user,input));assert.equal(calls.length,0);
  }
});
test('missing company or failed audit rolls back the policy change',async()=>{
  for(const options of [{exists:false},{auditFails:true}]){
    const {pool,calls}=fixture(options);await assert.rejects(saveStockSettings(pool,user,{allowNegativeStock:true}));
    assert.equal(calls.at(-1).sql,'ROLLBACK');assert.ok(!calls.some(call=>call.sql==='COMMIT'));
  }
});
