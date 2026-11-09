import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {registerLocalLogin} from '../src/modules/local-login.js';
import {errorHandler} from '../src/http/errors.js';
import {controllers} from '../src/http/controllers.js';
import {hashPassword} from '../src/modules/auth.service.js';
import {saveUser} from '../src/modules/admin.service.js';

test('local login lists only active names/IDs under the configured company and requires Retail activation',async()=>{
 const company=randomUUID(),id=randomUUID(),calls=[];let active=true;
 const pool={async query(sql,args){calls.push({sql,args});return {rows:sql.startsWith('SELECT id,name FROM companies')?[{id:company,name:'Test store'}]:[{id,name:'Local admin',isAdmin:true}]};}};
 const app=express();registerLocalLogin(app,{pool,licenseProvider:async()=>({status:active?'ACTIVE':'EXPIRED',activated:active,product:'retail'})});app.use(errorHandler);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{const url=`http://127.0.0.1:${server.address().port}/api/auth/accounts`;const response=await fetch(url),body=await response.json();assert.equal(response.status,200);assert.deepEqual(body,{items:[{id,name:'Local admin',isAdmin:true}],branding:{name:'Test store'}});assert.deepEqual(calls[1].args,[company]);assert.match(calls[1].sql,/u.active/);assert.doesNotMatch(calls[1].sql,/password|phone|username/);active=false;assert.equal((await fetch(url)).status,403);assert.equal(calls.length,2);}finally{await new Promise(resolve=>server.close(resolve));}
});

test('ID login retains password verification, legacy username login and failed-attempt accounting',async()=>{
 const id=randomUUID(),passwordHash=await hashPassword('7');let failures=0,sessions=0;
 const db={release(){},async query(sql,args){
  if(sql.startsWith('SELECT username FROM users'))return {rows:args[0]===id?[{username:'local_internal'}]:[]};
  if(sql==='SELECT failures FROM login_attempts WHERE key=$1')return {rows:[{failures}]};
  if(sql.startsWith('SELECT id,password_hash'))return {rows:args[0]==='local_internal'?[{id,active:true,password_hash:passwordHash}]:[]};
  if(sql.startsWith('UPDATE login_attempts'))failures++;
  if(sql.startsWith('INSERT INTO sessions'))sessions++;
  if(sql.startsWith('SELECT id,company_id AS'))return {rows:[{id,companyId:randomUUID(),name:'Test'}]};
  return {rows:[]};
 }},pool={...db,async connect(){return db;}},controller=controllers({pool,config:{sessionHours:8,secureCookie:false}}),response={cookie(){return this;},json(value){return value;}};
 await controller.login({body:{userId:id,password:'7'},ip:'127.0.0.1'},response);assert.equal(sessions,1);
 await controller.login({body:{username:'local_internal',password:'7'},ip:'127.0.0.1'},response);assert.equal(sessions,2);
 await assert.rejects(()=>controller.login({body:{userId:id,password:'8'},ip:'127.0.0.1'},response),{code:'INVALID_CREDENTIALS'});assert.equal(sessions,2);assert.equal(failures,1);
 await assert.rejects(()=>controller.login({body:{userId:randomUUID(),password:'7'},ip:'127.0.0.1'},response),{code:'INVALID_CREDENTIALS'});assert.equal(sessions,2);assert.equal(failures,2);
 failures=8;await assert.rejects(()=>controller.login({body:{userId:id,password:'7'},ip:'127.0.0.1'},response),{code:'LOGIN_THROTTLED'});
});

test('local accounts generate an internal username, accept short local codes and protect the last admin',async()=>{
 const actor={id:randomUUID(),companyId:randomUUID(),permissions:['users.read'],roles:[{is_admin:true}],branches:[randomUUID()],warehouses:[randomUUID()]},roleId=randomUUID();let hasAdmin=true,insert;
 const db={release(){},async query(sql,args){
  if(sql.startsWith('SELECT * FROM roles'))return {rows:[{id:roleId,is_admin:false}]};
  if(sql.startsWith('SELECT permission_id'))return {rows:[{permission_id:'users.read'}]};
  if(sql.startsWith('SELECT branch_id FROM warehouses'))return {rows:[{branch_id:actor.branches[0]}]};
  if(sql.startsWith('INSERT INTO users'))insert=args;
  if(sql.startsWith('SELECT 1 FROM users u JOIN'))return {rows:hasAdmin?[{}]:[],rowCount:hasAdmin?1:0};
  return {rows:[],rowCount:1};
 }},pool={async connect(){return db;}},input={name:'Cashier',phone:'0123456789',password:'7',roleIds:[roleId],branches:actor.branches,warehouses:actor.warehouses};
 const result=await saveUser(pool,actor,undefined,input);assert.match(result.username,/^local_/);assert.equal(insert[6],input.phone);assert.match(insert[4],/^scrypt:/);assert.notEqual(insert[4],input.password);
 hasAdmin=false;await assert.rejects(()=>saveUser(pool,actor,undefined,input),{code:'LAST_ADMIN_PROTECTED'});
 await assert.rejects(()=>saveUser(pool,actor,undefined,{...input,branches:[randomUUID()]}),{code:'SCOPE_GRANT_DENIED'});
});

test('user details are company scoped and never include password hashes',async()=>{
 const companyId=randomUUID(),id=randomUUID(),calls=[],pool={async query(sql,args){calls.push({sql,args});return {rows:sql.startsWith('SELECT id,username,name')?[{id,name:'Cashier',active:true,phone:''}]:[]};}};
 let body;await controllers({pool,config:{sessionHours:8}}).user({params:{id},user:{companyId}},{json(value){body=value;}});
 assert.equal(body.id,id);assert.equal(body.password_hash,undefined);assert.ok(calls.every(({sql,args})=>sql.includes('company_id=$1')&&args[0]===companyId&&args[1]===id));
});
