import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {listCategories,saveCategory,deleteCategory} from '../src/modules/categories.service.js';

function fixture(){
 const companyId=randomUUID(),user={id:randomUUID(),companyId},calls=[],rows=new Map();let used=false;
 const db={release(){},async query(sql,args){calls.push({sql,args});
  if(sql.startsWith('SELECT c.id,c.name'))return {rows:[...rows.values()].map(row=>({...row,productCount:used?1:0,activeProductCount:0}))};
  if(sql.startsWith('SELECT id FROM categories WHERE company_id=$1 AND id=$2'))return {rows:rows.has(args[1])?[{id:args[1]}]:[],rowCount:rows.has(args[1])?1:0};
  if(sql.startsWith('SELECT id FROM categories WHERE company_id=$1 AND lower'))return {rows:[],rowCount:[...rows.values()].filter(row=>row.name.toLowerCase()===args[1].toLowerCase()&&row.id!==args[2]).length};
  if(sql.startsWith('INSERT INTO categories'))rows.set(args[1],{id:args[1],name:args[2]});
  if(sql.startsWith('UPDATE categories'))rows.set(args[1],{id:args[1],name:args[2]});
  if(sql.startsWith('SELECT 1 FROM products'))return {rows:used?[{}]:[],rowCount:used?1:0};
  if(sql.startsWith('DELETE FROM categories'))rows.delete(args[1]);
  return {rows:[],rowCount:1};
 }},pool={...db,async connect(){return db;}};
 return {user,calls,rows,pool,setUsed(value){used=value;}};
}
test('categories retain IDs on rename, reject duplicate names and stay company scoped',async()=>{
 const f=fixture(),created=await saveCategory(f.pool,f.user,undefined,{name:' New category '});assert.equal(created.name,'New category');assert.ok(created.id);
 const renamed=await saveCategory(f.pool,f.user,created.id,{name:'Renamed'});assert.equal(renamed.id,created.id);
 await assert.rejects(()=>saveCategory(f.pool,f.user,undefined,{name:'renamed'}),{code:'CATEGORY_NAME_EXISTS'});
 const list=await listCategories(f.pool,f.user.companyId);assert.deepEqual(list.items.map(row=>row.name),['Renamed']);
 const entityQueries=f.calls.filter(({sql})=>/^(SELECT c.id|SELECT id FROM categories|INSERT INTO categories|UPDATE categories)/.test(sql));assert.ok(entityQueries.every(({args})=>args[0]===f.user.companyId));
 assert.ok(f.calls.some(({sql,args})=>sql.includes('pg_advisory_xact_lock')&&args[0]===`catalog:${f.user.companyId}`));
 assert.ok(!f.calls.some(({sql})=>sql.startsWith('UPDATE products')));
});
test('deletion protects archived as well as active product links and only removes empty categories',async()=>{
 const f=fixture(),created=await saveCategory(f.pool,f.user,undefined,{name:'Protected'});f.setUsed(true);
 await assert.rejects(()=>deleteCategory(f.pool,f.user,created.id),{code:'CATEGORY_IN_USE'});assert.ok(f.rows.has(created.id));
 const check=f.calls.find(({sql})=>sql.startsWith('SELECT 1 FROM products'));assert.doesNotMatch(check.sql,/archived_at/);
 f.setUsed(false);assert.equal((await deleteCategory(f.pool,f.user,created.id)).deleted,true);assert.equal(f.rows.size,0);
 await assert.rejects(()=>deleteCategory(f.pool,f.user,created.id),{code:'NOT_FOUND'});
});
test('category inputs reject blank or oversized names and cross-company missing IDs',async()=>{
 const f=fixture();for(const name of ['', '   ','x'.repeat(101)])await assert.rejects(()=>saveCategory(f.pool,f.user,undefined,{name}));
 await assert.rejects(()=>saveCategory(f.pool,f.user,undefined,{name:'Valid',companyId:randomUUID()}));
 await assert.rejects(()=>saveCategory(f.pool,f.user,'outside',{name:'Valid'}),{code:'NOT_FOUND'});assert.equal(f.rows.size,0);
});
