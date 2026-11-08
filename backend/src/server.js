import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createPool } from './db/pool.js';
import { readFile } from 'node:fs/promises';
import { createActivationService } from './activation/service.js';
import https from 'node:https';
import http from 'node:http';
import { BackupManager } from './operations/backup.js';
import { readJSON } from './operations/files.js';
import { join } from 'node:path';
import { createMaintenance } from './operations/maintenance.js';
import { validateMigrations } from './operations/restore.js';
import net from 'node:net';
const config=readConfig(),pool=createPool(config.databaseUrl);
const leader=await pool.connect();if(!(await leader.query("SELECT pg_try_advisory_lock(hashtext('retail:server-instance')) locked")).rows[0].locked)throw Error('Another Retail server already owns this database');
const applied=(await pool.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;await validateMigrations(applied);
const {readdir}=await import('node:fs/promises');if(applied.length!==(await readdir(new URL('./db/migrations/',import.meta.url))).filter(name=>/^\d{3}_.+\.sql$/.test(name)).length)throw Error('Database upgrade required before this server version can start');
const activationService=await createActivationService({pool,publicKey:await readFile(config.activationPublicKeyPath,'utf8'),integrityPath:config.activationIntegrityPath});
await pool.query('DELETE FROM sessions WHERE expires_at<now()');
const cleanup=setInterval(()=>{pool.query('DELETE FROM sessions WHERE expires_at<now()').catch(()=>console.error(JSON.stringify({event:'session_cleanup_failed'})));},3600000);cleanup.unref();
let operations,stopBackups;
if(config.operations){const settings=await readJSON(join(config.operations.stateDirectory,'backup-location.json'),{}),backups=new BackupManager({pool,connection:config.databaseUrl,...config.operations,directory:settings.directory??config.operations.directory});operations={...config.operations,backups,maintenance:createMaintenance(),runtimeConnection:config.databaseUrl,runtimeRole:new URL(config.databaseUrl).username,switchDatabase:globalThis.retailSwitchDatabase,requestRestart:()=>shutdown(75)};if(process.env.RETAIL_UPDATE_PENDING==='true'){operations.maintenance.active=true;backups.paused=true;}stopBackups=backups.start();}
const app=createApp({pool,config,activationService,operations}),server=config.tlsPfx?https.createServer({pfx:await readFile(config.tlsPfx),passphrase:config.tlsPassphrase,minVersion:'TLSv1.2'},app):http.createServer(app);server.listen(config.port,config.host,()=>console.log(JSON.stringify({event:'listening',host:config.host,port:config.port,tls:Boolean(config.tlsPfx),mode:'acceptance-candidate'})));
let closing=false;
let control;if(process.env.RETAIL_CONTROL_TOKEN){control=net.createServer(socket=>{let input='';socket.setTimeout(5000,()=>socket.destroy());socket.on('data',chunk=>{input+=chunk;if(input.length>500)socket.destroy();});socket.on('end',()=>{try{const message=JSON.parse(input);if(message.action==='stop'&&message.token===process.env.RETAIL_CONTROL_TOKEN)shutdown();}catch{/* Unauthenticated control commands are ignored. */}});});control.listen(process.env.RETAIL_CONTROL_PIPE??'\\\\.\\pipe\\ShamTouchRetailServer');}
const shutdown=(code=0)=>{if(closing)return;closing=true;control?.close();clearInterval(cleanup);stopBackups?.();server.close(async()=>{while(operations?.backups.busy)await new Promise(resolve=>setTimeout(resolve,100));await leader.query('SELECT pg_advisory_unlock_all()');leader.release();await pool.end();process.exit(code);});setTimeout(()=>process.exit(1),30000).unref();};
process.on('SIGINT',()=>shutdown());process.on('SIGTERM',()=>shutdown());process.stdin.on('data',data=>{if(String(data).trim()==='stop')shutdown();});
