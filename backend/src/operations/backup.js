import { execFile as execute } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash,randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir,readFile,readdir,stat,rename,unlink } from 'node:fs/promises';
import { resolve,join,isAbsolute } from 'node:path';
import { atomicJSON,readJSON } from './files.js';
export const BACKUP_INTERVAL=6*60*60*1000,RETENTION=2*24*60*60*1000;
const filename=/^Retail-(automatic|manual|safety)-[0-9TZ-]+-[a-f0-9-]+\.pgdump$/;
const execFile=promisify(execute);
export async function digest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export function pgConnection(connection){const url=new URL(connection);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!url.pathname.startsWith('/sham_touch_retail_'))throw Error('Dedicated local Retail PostgreSQL required');return {host:url.hostname.replaceAll('[','').replaceAll(']',''),port:url.port||'5432',database:decodeURIComponent(url.pathname.slice(1)),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password)};}
export async function runPG(binary,connection,args,run=execFile){const pg=pgConnection(connection);return run(binary,['--host',pg.host,'--port',pg.port,'--username',pg.user,...args],{windowsHide:true,timeout:15*60*1000,maxBuffer:8*1024*1024,env:{...process.env,PGPASSWORD:pg.password,PGCONNECT_TIMEOUT:'10'}});}
export class BackupManager {
  constructor({pool,connection,toolsDirectory,stateDirectory,directory,now=()=>new Date(),run=execFile}){Object.assign(this,{pool,connection,toolsDirectory,stateDirectory,directory,now,run});this.statePath=join(stateDirectory,'backup-state.json');this.busy=false;}
  async status(){return {...await readJSON(this.statePath,{}),busy:this.busy,intervalHours:6,retentionDays:2,directory:this.directory};}
  async configure(directory){if(this.busy)throw Error('Wait for the current backup');if(!isAbsolute(directory)||directory.includes('\0'))throw Error('Absolute backup directory required');directory=resolve(directory);await mkdir(directory,{recursive:true});const probe=join(directory,`.retail-probe-${randomUUID()}`);await atomicJSON(probe,{probe:true});await unlink(probe);await atomicJSON(join(this.stateDirectory,'backup-location.json'),{directory});this.directory=directory;return this.status();}
  async list(){await mkdir(this.directory,{recursive:true});const items=[];for(const name of await readdir(this.directory)){if(!filename.test(name))continue;try{const manifest=await this.verify(name);items.push({name,createdAt:manifest.createdAt,size:manifest.size,database:manifest.database});}catch{/* Partial or invalid files never become restorable entries. */}}return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  async verify(name){if(!filename.test(name))throw Error('Invalid Retail backup name');const file=join(this.directory,name),manifest=JSON.parse(await readFile(file+'.json','utf8'));if(manifest.type!=='sham-touch-retail-backup/v1'||manifest.product!=='retail'||manifest.size!==(await stat(file)).size||manifest.sha256!==await digest(file))throw Error('Backup integrity verification failed');await runPG(join(this.toolsDirectory,'pg_restore.exe'),this.connection,['--list',file],this.run);return manifest;}
  async create(kind='manual'){
    if(!['manual','automatic','safety'].includes(kind)||this.busy)throw Error('Backup already running or invalid request');this.busy=true;let client;
    const time=this.now();let attempt={lastAttempt:time.toISOString()};
    try{
      attempt={...await readJSON(this.statePath,{}),...attempt};
      client=await this.pool.connect();const locked=(await client.query("SELECT pg_try_advisory_lock(hashtext('retail:backup')) locked")).rows[0].locked;if(!locked)throw Error('Another server is backing up this database');
      await client.query("SELECT pg_advisory_lock(hashtext('retail:migrations'))");
      await mkdir(this.directory,{recursive:true});const name=`Retail-${kind}-${time.toISOString().replaceAll(/[:.]/g,'-')}-${randomUUID()}.pgdump`,file=join(this.directory,name),temporary=file+'.partial';
      const migrations=(await client.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,companies=(await client.query('SELECT id FROM companies ORDER BY id')).rows.map(row=>row.id);
      await runPG(join(this.toolsDirectory,'pg_dump.exe'),this.connection,['--format=custom','--no-owner','--no-acl','--file',temporary,pgConnection(this.connection).database],this.run);
      await runPG(join(this.toolsDirectory,'pg_restore.exe'),this.connection,['--list',temporary],this.run);
      const manifest={type:'sham-touch-retail-backup/v1',product:'retail',version:'0.4.0-rc.1',database:pgConnection(this.connection).database,createdAt:time.toISOString(),companies,migrations,size:(await stat(temporary)).size,sha256:await digest(temporary)};
      await rename(temporary,file);await atomicJSON(file+'.json',manifest);await this.verify(name);await atomicJSON(this.statePath,{...attempt,lastSuccess:time.toISOString(),lastBackup:name,lastFailure:null});
      await this.retain(name).catch(()=>console.error(JSON.stringify({event:'retail_backup_retention_failed'})));return {name,...manifest};
    }catch(error){await atomicJSON(this.statePath,{...attempt,lastFailure:{at:this.now().toISOString(),message:'Backup failed; previous verified backups were retained.'}});throw error;}
    finally{if(client){await client.query("SELECT pg_advisory_unlock_all()").catch(()=>{});client.release();}this.busy=false;}
  }
  async retain(latest){for(const entry of await this.list()){if(entry.name===latest||+this.now()-Date.parse(entry.createdAt)<=RETENTION)continue;await unlink(join(this.directory,entry.name));await unlink(join(this.directory,entry.name)+'.json');}}
  async tick(){const status=await this.status();if(this.busy||this.paused)return;if(status.lastFailure&&+this.now()-Date.parse(status.lastFailure.at)<30*60000)return;if(!status.lastSuccess||+this.now()-Date.parse(status.lastSuccess)>=BACKUP_INTERVAL)await this.create('automatic');}
  start(){const run=()=>this.tick().catch(()=>console.error(JSON.stringify({event:'retail_backup_failed'})));this.timer=setInterval(run,60000);this.timer.unref();void run();return()=>clearInterval(this.timer);}
}
