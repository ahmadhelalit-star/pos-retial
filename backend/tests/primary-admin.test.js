import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadUser} from '../src/modules/auth.repository.js';
import {deleteUser} from '../src/modules/admin.service.js';
import {PERMISSIONS} from '../src/modules/registry.js';

test('primary administrator gets every permission and current branch and warehouse without explicit grants',async()=>{
  const id=randomUUID(),companyId=randomUUID(),branch=randomUUID(),warehouse=randomUUID();
  const db={async query(sql){
    if(sql.startsWith('SELECT id,company_id'))return {rows:[{id,companyId,is_primary_admin:true}]};
    if(sql.startsWith('SELECT id,name,is_admin'))return {rows:[{id:'admin-role',is_admin:true}]};
    if(sql.startsWith('SELECT id FROM branches'))return {rows:[{id:branch}]};
    if(sql.startsWith('SELECT id FROM warehouses'))return {rows:[{id:warehouse}]};
    return {rows:[]};
  }};
  const user=await loadUser(db,id);
  assert.deepEqual(user.permissions,[...PERMISSIONS]);
  assert.deepEqual(user.branches,[branch]);
  assert.deepEqual(user.warehouses,[warehouse]);
  assert.equal(user.roles[0].is_admin,true);
});

test('only the primary administrator can delete accounts and the primary account is protected',async()=>{
  const actor={id:randomUUID(),companyId:randomUUID(),is_primary_admin:true};
  let targetPrimary=true,openShift=false;
  const statements=[];
  const pool={connect:async()=>({release(){},async query(sql,args){
    statements.push({sql,args});
    if(sql.startsWith('SELECT is_primary_admin'))return {rows:[{is_primary_admin:targetPrimary,deleted_at:null}]};
    if(sql.startsWith('SELECT 1 FROM shifts'))return {rows:[],rowCount:openShift?1:0};
    return {rows:[],rowCount:1};
  }})};
  const target=randomUUID();
  await assert.rejects(deleteUser(pool,{...actor,is_primary_admin:false},target),error=>error.code==='PRIMARY_ADMIN_REQUIRED');
  assert.equal(statements.length,0);
  await assert.rejects(deleteUser(pool,actor,target),error=>error.code==='PRIMARY_ADMIN_PROTECTED');
  targetPrimary=false;openShift=true;
  await assert.rejects(deleteUser(pool,actor,target),error=>error.code==='USER_SHIFT_OPEN');
  assert.ok(!statements.some(row=>row.sql.startsWith('UPDATE')));
  openShift=false;
  await deleteUser(pool,actor,target);
  assert.ok(statements.some(row=>row.sql==='DELETE FROM sessions WHERE user_id=$1'));
  assert.ok(statements.some(row=>row.sql.startsWith('UPDATE users SET active=false,deleted_at=now()')));
  assert.ok(!statements.some(row=>row.sql.startsWith('DELETE FROM users')));
  assert.deepEqual(statements.find(row=>row.sql.startsWith('UPDATE users')).args,[actor.companyId,target]);
});
