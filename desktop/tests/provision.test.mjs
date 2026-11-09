import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID,createHash } from 'node:crypto';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createPool } from '../../backend/src/db/pool.js';
import { readPrivate } from '../private-state.mjs';
test('Windows initial provisioning accepts installer fields, protects recovery and refuses database replacement',async()=>{
  const url=new URL(process.env.TEST_DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/sham_touch_retail_.*test$/);
  const root=resolve(process.env.TEST_ARTIFACT_DIR??'../work/desktop','provision-'+randomUUID());await mkdir(root,{recursive:true});
  const input=join(root,'input.json'),journal=join(root,'recovery.json'),database='sham_touch_retail_provision_'+randomUUID().replaceAll('-','')+'_test';
  await writeFile(input,JSON.stringify({pgPort:url.port,pgUser:decodeURIComponent(url.username),pgPassword:decodeURIComponent(url.password),database,company:'Synthetic Windows provision',username:'synthetic-admin',password:'Synthetic-Setup-Only!123',provisionJournal:journal}));
  const run=promisify(execFile),args=['desktop/provision.mjs',input],{stdout}=await run(process.execPath,args,{windowsHide:true}),result=JSON.parse(stdout),pool=createPool(result.databaseUrl);
  try{assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count,'9');assert.equal((await pool.query('SELECT id FROM companies')).rows[0].id,result.companyId);await assert.rejects(pool.query('CREATE TABLE forbidden(id integer)'),/permission denied/);const protectedText=await readFile(journal,'utf8');assert.ok(!protectedText.includes('ownerPassword'));const recovered=await readPrivate(journal);assert.equal(recovered.database,database);assert.equal(new URL(result.databaseUrl).username,recovered.runtime);const before=createHash('sha256').update(protectedText).digest('hex');await assert.rejects(run(process.execPath,args,{windowsHide:true}),/Database already exists/);assert.equal(createHash('sha256').update(await readFile(journal)).digest('hex'),before);}finally{await pool.end();}
});
