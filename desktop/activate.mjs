import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';
import { readFile,copyFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { readPrivate,writePrivate } from './private-state.mjs';
import { readJSON,atomicJSON } from '../backend/src/operations/files.js';
import { createPool } from '../backend/src/db/pool.js';
import { BackupManager } from '../backend/src/operations/backup.js';
import { restoreBackup } from '../backend/src/operations/restore.js';
import { createMaintenance } from '../backend/src/operations/maintenance.js';
import { activateUpdate,verifyRelease } from './release.mjs';
const [baseArgument,versionArgument,mode]=process.argv.slice(2),base=resolve(baseArgument),versionRoot=resolve(versionArgument);
if(!versionRoot.startsWith(join(base,'versions')+'\\')&&!versionRoot.startsWith(join(base,'versions')+'/'))throw Error('Version must remain inside the Retail installation');
const pointerPath=join(base,'current.json'),previous=await readJSON(pointerPath,null),trustedKey=await readFile(join(previous?join(base,'versions',previous.version):versionRoot,'release-public.pem'),'utf8'),release=await verifyRelease(versionRoot,trustedKey,previous?.version),run=promisify(execFile);
if(previous?.version===release.version){const old=JSON.parse(await readFile(join(base,'versions',previous.version,'release.json'),'utf8')),next=JSON.parse(await readFile(join(versionRoot,'release.json'),'utf8'));if(old.payload!==next.payload)throw Error('Same-version package replacement is prohibited');}
if(mode==='cashier'){await atomicJSON(pointerPath,{product:'retail',version:release.version});process.stdout.write('Cashier code activated without PostgreSQL installation.');process.exit(0);}
const data=join(process.env.PROGRAMDATA,'Sham Touch','Retail Server'),configPath=join(data,'server-private.json'),original=await readPrivate(configPath),pool=createPool(original.environment.DATABASE_URL);let active=original;
const service=action=>run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(base,'service','Manage-RetailService.ps1'),'-Action',action,'-InstallDir',base],{windowsHide:true,timeout:90000});
const health=async()=>{const ca=await readFile(join(process.env.PROGRAMDATA,'Sham Touch','Retail Public','server-ca.pem')),url=new URL('/api/health',active.environment.WEB_ORIGIN);url.hostname='127.0.0.1';for(let i=0;i<40;i++){const valid=await new Promise(resolve=>{const request=https.get(url,{ca,rejectUnauthorized:true},response=>{let text='';response.on('data',data=>text+=data);response.on('end',()=>{try{const value=JSON.parse(text);resolve(response.statusCode===200&&value.product==='retail'&&value.status==='ok');}catch{resolve(false);}});});request.setTimeout(1000,()=>request.destroy());request.on('error',()=>resolve(false));});if(valid)return true;await new Promise(resolve=>setTimeout(resolve,500));}return false;};
const backups=new BackupManager({pool,connection:original.environment.DATABASE_URL,toolsDirectory:join(versionRoot,'pg-tools'),stateDirectory:original.environment.RETAIL_OPERATIONS_DIR,directory:(await readJSON(join(original.environment.RETAIL_OPERATIONS_DIR,'backup-location.json'),{})).directory??original.environment.RETAIL_BACKUP_DIR});
await copyFile(configPath,configPath+'.before-update');await atomicJSON(join(data,'update-journal.json'),{state:'prepared',previousVersion:previous?.version??null,nextVersion:release.version,at:new Date().toISOString()});
try{
  await activateUpdate({directory:versionRoot,publicKey:trustedKey,currentVersion:previous?.version,
    stop:()=>service('Stop'),backup:()=>backups.create('safety'),
    stage:async safety=>{if(previous&&previous.version!==release.version){await restoreBackup({backups,maintenanceConnection:original.environment.RETAIL_MAINTENANCE_URL,runtimeConnection:original.environment.DATABASE_URL,runtimeRole:new URL(original.environment.DATABASE_URL).username,maintenance:createMaintenance(),stateDirectory:original.environment.RETAIL_OPERATIONS_DIR,switchDatabase:async(databaseUrl,maintenanceUrl)=>{active={...original,version:release.version,environment:{...original.environment,DATABASE_URL:databaseUrl,RETAIL_MAINTENANCE_URL:maintenanceUrl,RETAIL_PG_TOOLS:join(versionRoot,'pg-tools'),RETAIL_DATA_EPOCH:original.environment.RETAIL_DATA_EPOCH??createHash('sha256').update(new URL(original.environment.DATABASE_URL).pathname).digest('hex'),RETAIL_UPDATE_PENDING:'true'}};await writePrivate(configPath,active);}},safety.name,'windows-installer');}else{active={...original,environment:{...original.environment,RETAIL_DATA_EPOCH:original.environment.RETAIL_DATA_EPOCH??createHash('sha256').update(new URL(original.environment.DATABASE_URL).pathname).digest('hex'),RETAIL_UPDATE_PENDING:'true',RETAIL_PG_TOOLS:join(versionRoot,'pg-tools')}};await writePrivate(configPath,active);}},
    switchCode:()=>atomicJSON(pointerPath,{product:'retail',version:release.version}),start:()=>service('Install'),health,
    rollback:async()=>{await service('Stop').catch(()=>{});await writePrivate(configPath,original);if(previous){await atomicJSON(pointerPath,previous);await service('Start');}await atomicJSON(join(data,'update-journal.json'),{state:'rolled-back',previousVersion:previous?.version??null,nextVersion:release.version,at:new Date().toISOString()});}
  });
  // Commit only after code/TLS/schema health passed while all business requests were blocked.
  active={...active,environment:{...active.environment,RETAIL_UPDATE_PENDING:'false'}};await writePrivate(configPath,active);await atomicJSON(join(data,'update-journal.json'),{state:'committed',previousVersion:previous?.version??null,nextVersion:release.version,at:new Date().toISOString()});await service('Stop');await service('Start');process.stdout.write('Retail candidate activated; old code and database remain preserved.');
}finally{await pool.end();}
