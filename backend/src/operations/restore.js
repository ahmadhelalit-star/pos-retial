import { randomUUID,createHash } from 'node:crypto';
import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { pgConnection,runPG } from './backup.js';
import { grantRuntime } from './permissions.js';
import { atomicJSON } from './files.js';
export async function validateMigrations(migrations){
  const folder=new URL('../db/migrations/',import.meta.url),files=(await readdir(folder)).filter(name=>/^\d{3}_.+\.sql$/.test(name)).sort();
  if(!Array.isArray(migrations)||!migrations.length||migrations.length>files.length)throw Error('Incompatible database version');
  for(const [index,row] of migrations.entries()){if(row.name!==files[index])throw Error('Migration sequence is incompatible');const checksum=createHash('sha256').update((await readFile(new URL(row.name,folder),'utf8')).replace(/\r\n/g,'\n')).digest('hex');if(checksum!==row.checksum)throw Error('Migration checksum is incompatible');}
}
export async function restoreBackup({backups,maintenanceConnection,runtimeConnection,runtimeRole,switchDatabase,maintenance,stateDirectory},name,actor){
  if(maintenance.active)throw Error('Maintenance already active');if(!maintenanceConnection||!switchDatabase)throw Error('Restore deployment is not configured');
  const manifest=await backups.verify(name);await validateMigrations(manifest.migrations);const companies=(await backups.pool.query('SELECT id FROM companies ORDER BY id')).rows.map(row=>row.id);if(JSON.stringify(manifest.companies)!==JSON.stringify(companies))throw Error('Backup belongs to another installation or company');maintenance.active=true;backups.paused=true;
  let owner,stage;const source=pgConnection(runtimeConnection).database,target=`sham_touch_retail_restore_${randomUUID().replaceAll('-','')}`;
  try{
    await maintenance.drain();const safety=await backups.create('safety');owner=createPool(maintenanceConnection);await owner.query(`CREATE DATABASE ${target}`);await owner.query(`REVOKE ALL ON DATABASE ${target} FROM PUBLIC`);if(!/^retail_app_[a-z0-9_]+$/.test(runtimeRole))throw Error('Dedicated runtime role required');await owner.query(`GRANT CONNECT ON DATABASE ${target} TO ${runtimeRole}`);
    const stageUrl=new URL(maintenanceConnection);stageUrl.pathname='/'+target;
    await runPG(join(backups.toolsDirectory,'pg_restore.exe'),stageUrl.href,['--no-owner','--no-acl','--exit-on-error','--dbname',target,join(backups.directory,name)],backups.run);
    stage=createPool(stageUrl.href);const restored=(await stage.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;await validateMigrations(restored);if(JSON.stringify(restored)!==JSON.stringify(manifest.migrations))throw Error('Dump migration manifest mismatch');await migrate(stage);
    // Restore never rolls the active device license or sessions back to the backup timestamp.
    const license=(await backups.pool.query('SELECT * FROM retail_activation WHERE id=1')).rows[0];await stage.query('DELETE FROM retail_activation');if(license)await stage.query('INSERT INTO retail_activation(id,request,code,state,mac,updated_at) VALUES(1,$1,$2,$3,$4,$5)',[license.request,license.code,license.state,license.mac,license.updated_at]);await stage.query('DELETE FROM sessions');await grantRuntime(stage,runtimeRole);
    const runtimeUrl=new URL(runtimeConnection);runtimeUrl.pathname='/'+target;const test=createPool(runtimeUrl.href);try{await test.query('SELECT count(*) FROM commercial_documents');}finally{await test.end();}
    await atomicJSON(join(stateDirectory,'last-restore.json'),{at:new Date().toISOString(),actor,source,target,backup:name,safety:safety.name,status:'prepared'});
    await switchDatabase(runtimeUrl.href,stageUrl.href);maintenance.restartRequired=true;await atomicJSON(join(stateDirectory,'last-restore.json'),{at:new Date().toISOString(),actor,source,target,backup:name,safety:safety.name,status:'switched'}).catch(()=>console.error(JSON.stringify({event:'restore_audit_file_failed'})));
    return {restored:true,restartRequired:true,safetyBackup:safety.name,previousDatabasePreserved:true};
  }catch(error){maintenance.active=false;backups.paused=false;throw error;}finally{await stage?.end();await owner?.end();}
}
