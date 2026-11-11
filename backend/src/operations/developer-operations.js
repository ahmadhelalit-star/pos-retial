import {readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DeveloperBackupManager} from './developer-backup.js';
import {createMaintenance} from './maintenance.js';
import {atomicJSON,atomicText,readJSON} from './files.js';
import {fail} from '../http/errors.js';

const literal=value=>value===null||value===undefined?'NULL':"'"+String(typeof value==='object'?JSON.stringify(value):value).replaceAll("'","''")+"'";
export function restoreStatements(manifest,license,actor){
 const companies=literal(manifest.companies),migrations=literal(manifest.migrations);
 const checks=`DO $retail_check$ BEGIN
 IF current_database()<>'sham_retail_dev' THEN RAISE EXCEPTION 'Wrong restore database'; END IF;
 IF (SELECT jsonb_agg(id::text ORDER BY id) FROM companies) IS DISTINCT FROM ${companies}::jsonb THEN RAISE EXCEPTION 'Backup company mismatch'; END IF;
 IF (SELECT jsonb_agg(jsonb_build_object('name',name,'checksum',checksum) ORDER BY name) FROM schema_migrations) IS DISTINCT FROM ${migrations}::jsonb THEN RAISE EXCEPTION 'Backup schema mismatch'; END IF;
 END $retail_check$;`;
 return [checks,'DELETE FROM retail_activation;',...(license?[`INSERT INTO retail_activation(id,request,code,state,mac,updated_at) VALUES(1,${literal(license.request)},${literal(license.code)},${literal(license.state)},${literal(license.mac)},${literal(license.updated_at instanceof Date?license.updated_at.toISOString():license.updated_at)});`]:[]),'DELETE FROM sessions;',`INSERT INTO audit_logs(company_id,user_id,action,entity_id,details) VALUES(${literal(manifest.companies[0])},(SELECT id FROM users WHERE id=${literal(actor)}::uuid AND company_id=${literal(manifest.companies[0])}::uuid),'restore.complete',${literal(manifest.name)},${literal({backup:manifest.name,requestedBy:actor,mode:'same-database'})});`];
}
export function restoreValidationSQL(manifest,license,actor){return '\n'+restoreStatements(manifest,license,actor).join('\n')+'\n';}

export async function restoreDeveloperBackup(operations,name,actor){
 const {backups,maintenance,pool,privateDirectory}=operations;
 if(maintenance.active||backups.busy)fail(409,'BACKUP_BUSY','عملية نسخ أو استعادة قيد التنفيذ.');
 maintenance.active=true;backups.paused=true;let committed=false,oldEnv,script,envChanged=false;
 try{
  const manifest=await backups.verify(name);await maintenance.drain();await operations.beforeRestore?.();
  const license=(await pool.query('SELECT * FROM retail_activation WHERE id=1')).rows[0],safety=await backups.create('safety',true),epoch=randomUUID();
  script=join(backups.stateDirectory,'restore-'+randomUUID()+'.sql');
  await backups.pg('pg_restore',['--clean','--if-exists','--no-owner','--no-acl','--file',script,join(backups.directory,name)]);
  const sql=await readFile(script,'utf8');await writeFile(script,sql+restoreValidationSQL(manifest,license,actor),{mode:0o600});
  oldEnv=await readFile(join(privateDirectory,'.env'),'utf8');const setting='RETAIL_DATA_EPOCH='+epoch,newEnv=/^RETAIL_DATA_EPOCH=.*$/m.test(oldEnv)?oldEnv.replace(/^RETAIL_DATA_EPOCH=.*$/m,setting):oldEnv.trimEnd()+'\n'+setting+'\n';
  await atomicText(join(backups.stateDirectory,'restore-env-before.txt'),oldEnv);await atomicText(join(privateDirectory,'.env'),newEnv);envChanged=true;
  await backups.pg('psql',['--no-psqlrc','--single-transaction','--set','ON_ERROR_STOP=1','--dbname','sham_retail_dev','--file',script]);committed=true;
  const result={restored:true,restartRequired:true,epoch,safetyBackup:safety.name,sameDatabase:true};maintenance.restartRequired=true;
  await atomicJSON(join(backups.stateDirectory,'last-restore.json'),{at:new Date().toISOString(),actor,backup:name,...result}).catch(()=>console.error(JSON.stringify({event:'restore_status_write_failed'})));return result;
 }catch(error){if(!committed){if(envChanged)await atomicText(join(privateDirectory,'.env'),oldEnv);maintenance.active=false;backups.paused=false;operations.afterRestoreFailure?.();}throw error;}
 finally{if(script)await unlink(script).catch(()=>{});}
}
export async function createDeveloperOperations({pool,config,requestRestart,run}){
 const options=config.developerOperations;if(!options)throw Error('Explicit Developer operations profile required');
 const companies=(await pool.query('SELECT id FROM companies ORDER BY id')).rows;if(companies.length!==1)fail(503,'OPERATIONS_SCOPE','يلزم إعداد منشأة Retail واحدة.');
 let toolsDirectory=options.toolsDirectory;if(!toolsDirectory){const root=join(process.env.ProgramFiles??'C:/Program Files','PostgreSQL'),versions=(await readdir(root)).filter(value=>/^\d+$/.test(value)).sort((a,b)=>Number(b)-Number(a));if(!versions.length)throw Error('PostgreSQL tools are unavailable');toolsDirectory=join(root,versions[0],'bin');}
 const dataDirectory=(await pool.query('SHOW data_directory')).rows[0]?.data_directory,project=resolve(options.privateDirectory,'..');
 const backups=new DeveloperBackupManager({pool,connection:config.databaseUrl,companyId:companies[0].id,toolsDirectory,stateDirectory:options.stateDirectory,directory:options.directory,protectedRoots:[project,resolve(project,'..','pos-offline'),resolve(toolsDirectory,'..'),...(dataDirectory?[dataDirectory]:[])],run});await backups.initialize();
 const operations={pool,backups,companyId:companies[0].id,maintenance:createMaintenance(),stateDirectory:options.stateDirectory,privateDirectory:options.privateDirectory,restoreMode:'same-database',restoreConfigured:true,requestRestart};
 operations.restore=(name,actor)=>restoreDeveloperBackup(operations,name,actor);
 operations.lastRestore=()=>readJSON(join(options.stateDirectory,'last-restore.json'),null);return operations;
}
