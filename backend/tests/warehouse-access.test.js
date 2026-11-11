import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {saveUser} from '../src/modules/admin.service.js';

test('admin can reassign an unassigned warehouse within their branch only',async()=>{
  const branch=randomUUID(),warehouse=randomUUID(),role=randomUUID(),target=randomUUID();
  const actor={id:randomUUID(),companyId:randomUUID(),branches:[branch],warehouses:[],roles:[{is_admin:true}],permissions:['users.manage']};
  const input={name:'Cashier',roleIds:[role],branches:[branch],warehouses:[warehouse]};
  const grants=[];
  let warehouseBranch=branch;
  const pool={connect:async()=>({release(){},async query(sql,args){
    if(sql.startsWith('SELECT * FROM roles'))return {rows:[{is_admin:false}]};
    if(sql.startsWith('SELECT branch_id FROM warehouses'))return {rows:[{branch_id:warehouseBranch}]};
    if(sql.startsWith('INSERT INTO user_warehouses'))grants.push(args);
    return {rows:[{username:'cashier'}].filter(()=>!sql.startsWith('SELECT permission_id')),rowCount:1};
  }})};
  await assert.rejects(saveUser(pool,{...actor,roles:[{is_admin:false}]},target,input),error=>error.code==='SCOPE_GRANT_DENIED');
  warehouseBranch=randomUUID();
  await assert.rejects(saveUser(pool,actor,target,input),error=>error.code==='INVALID_SCOPE');
  assert.deepEqual(grants,[]);
  warehouseBranch=branch;
  await saveUser(pool,actor,target,input);
  assert.deepEqual(grants,[[actor.companyId,target,warehouse]]);
});
