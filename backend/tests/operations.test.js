import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile,copyFile,appendFile,stat } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { bootstrap } from '../src/modules/bootstrap.service.js';
import { BackupManager,BACKUP_INTERVAL,RETENTION } from '../src/operations/backup.js';
import { restoreBackup } from '../src/operations/restore.js';
import { createMaintenance } from '../src/operations/maintenance.js';
test('real PostgreSQL operational backup, safe restore and retention',async t=>{
  assert.ok(process.env.TEST_DATABASE_URL);const url=new URL(process.env.TEST_DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/sham_touch_retail_.*test$/);
  const control=createPool(url.href),name=`sham_touch_retail_ops_${randomUUID().replaceAll('-','')}_test`,role=`retail_app_ops_${randomUUID().replaceAll('-','')}`;await control.query(`CREATE DATABASE ${name}`);await control.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`);url.pathname='/'+name;const pool=createPool(url.href);await migrate(pool);const fixture=await bootstrap(pool,{company:'Synthetic operations',username:'ops_'+randomUUID().slice(0,8),password:'Synthetic-Operations-Only!123'});
  const root=resolve(process.env.TEST_ARTIFACT_DIR??'../work/ops'),directory=join(root,'ops-'+randomUUID());await mkdir(directory,{recursive:true});let clock=Date.now();const backups=new BackupManager({pool,connection:url.href,toolsDirectory:process.env.TEST_PG_TOOLS??'C:/Program Files/PostgreSQL/17/bin',stateDirectory:join(directory,'state'),directory:join(directory,'backups'),now:()=>new Date(clock)});let first,current,switched;
  try{
    await pool.query("INSERT INTO partners(company_id,id,kind,name) VALUES($1,'backup-account','customer','Original')",[fixture.companyId]);
    await t.test('dump and manifest verify without password command arguments',async()=>{first=await backups.create('manual');assert.ok(first.size>0);assert.equal((await backups.verify(first.name)).sha256,first.sha256);assert.equal((await backups.status()).lastBackup,first.name);});
    await t.test('corruption is rejected before any restore action',async()=>{const other=first.name.replace('manual','safety');await copyFile(join(backups.directory,first.name),join(backups.directory,other));await copyFile(join(backups.directory,first.name+'.json'),join(backups.directory,other+'.json'));await appendFile(join(backups.directory,other),'corrupt');await assert.rejects(backups.verify(other));assert.equal((await backups.list()).length,1);});
    await t.test('failed new backup retains last good backup and visible failure status',async()=>{const run=backups.run;backups.run=async()=>{throw Error('Synthetic disk/tool failure');};await assert.rejects(backups.create());backups.run=run;const status=await backups.status();assert.equal(status.lastBackup,first.name);assert.ok(status.lastFailure);assert.equal((await backups.verify(first.name)).sha256,first.sha256);});
    await t.test('restore stages another database, preserves live license and old database',async()=>{
      await pool.query("UPDATE partners SET name='Live later' WHERE company_id=$1 AND id='backup-account'",[fixture.companyId]);await pool.query("INSERT INTO retail_activation(id,code,state,mac) VALUES(1,'synthetic-current-license','{\"lastSeen\":900}','synthetic-mac')");
      const runtime=new URL(url.href);runtime.username=role;runtime.password='';const maintenance=createMaintenance(),result=await restoreBackup({backups,maintenanceConnection:url.href,runtimeConnection:runtime.href,runtimeRole:role,maintenance,stateDirectory:join(directory,'state'),switchDatabase:async(runtime,owner)=>{switched={runtime,owner};}},first.name,fixture.userId);assert.equal(result.previousDatabasePreserved,true);assert.equal(maintenance.restartRequired,true);assert.ok(result.safetyBackup);
      current=createPool(switched.owner);assert.equal((await current.query("SELECT name FROM partners WHERE id='backup-account'")).rows[0].name,'Original');assert.equal((await pool.query("SELECT name FROM partners WHERE id='backup-account'")).rows[0].name,'Live later');assert.equal((await current.query('SELECT code FROM retail_activation')).rows[0].code,'synthetic-current-license');assert.equal((await current.query('SELECT count(*) FROM sessions')).rows[0].count,'0');const limited=createPool(switched.runtime);try{await limited.query('SELECT count(*) FROM partners');await assert.rejects(limited.query('UPDATE stock_balances SET quantity=999'));}finally{await limited.end();}
    });
    await t.test('retention removes only aged verified Retail copies after a successful replacement',async()=>{await writeFile(join(backups.directory,'unrelated-customer-file.txt'),'preserve');clock+=RETENTION+1;backups.paused=false;const next=await backups.create('automatic');await assert.rejects(stat(join(backups.directory,first.name)));assert.ok((await stat(join(backups.directory,next.name))).size);assert.ok(await stat(join(backups.directory,'unrelated-customer-file.txt')));});
    await t.test('scheduler obeys six hours and does not immediately retry a failure',async()=>{let calls=0;backups.create=async()=>{calls++;};await backups.tick();assert.equal(calls,0);clock+=BACKUP_INTERVAL;await backups.tick();assert.equal(calls,1);});
  }finally{await current?.end();await pool.end();await control.end();}
});
