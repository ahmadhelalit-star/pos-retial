import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';

test('retired import endpoints are absent even for an authorized administrator',async()=>{
  const user={id:randomUUID(),companyId:randomUUID(),name:'Fixture administrator'};
  const pool={async query(sql){
    if(sql.startsWith('SELECT user_id,csrf_token'))return {rows:[{user_id:user.id,csrf_token:'fixture'}]};
    if(sql.startsWith('SELECT id,company_id AS'))return {rows:[user]};
    if(sql.startsWith('SELECT DISTINCT rp.permission_id'))return {rows:['imports.preview','imports.commit'].map(permission_id=>({permission_id}))};
    if(sql.startsWith('SELECT r.id,r.name'))return {rows:[{id:randomUUID(),is_admin:true}]};
    if(sql.startsWith('SELECT branch_id FROM user_branches')||sql.startsWith('SELECT warehouse_id FROM user_warehouses'))return {rows:[]};
    throw new Error('Unexpected database access: '+sql);
  }};
  const app=createApp({pool,config:{origin:'http://127.0.0.1',sessionHours:8},licenseProvider:async()=>({status:'ACTIVE',activated:true,product:'retail',features:{}}),logger:()=>{}});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try{
    for(const [method,path] of [['POST','/imports/preview'],['POST','/imports/commit'],['POST','/legacy-import/preview'],['POST','/legacy-import/commit'],['GET','/legacy-import/records']]){
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers:{Origin:'http://127.0.0.1',Cookie:'retail_session=fixture','X-CSRF-Token':'fixture','Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
      assert.equal(response.status,404,path);assert.equal((await response.json()).error.code,'NOT_FOUND');
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});
