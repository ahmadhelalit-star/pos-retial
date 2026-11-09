import { spawn } from 'node:child_process';
import net from 'node:net';
import { mkdir,open,unlink,appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { root,privateDir,pipe,settings,readJSON,saveJSON,childEnvironment,sanitize } from './common.mjs';
import { createPool } from '../backend/src/db/pool.js';
import { inspect } from './database.mjs';
const children=[];let server,lock,closing=false,config;
async function available(port){const probe=net.createServer();probe.listen(port,'127.0.0.1');await once(probe,'listening');await new Promise(resolve=>probe.close(resolve));}
async function stop(){if(closing)return;closing=true;server?.close();const waits=children.map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);}));for(const child of children){if(child.exitCode!==null)continue;if(child.retailBackend)child.stdin.end('stop\n');else child.kill();}const timer=setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill();},8000);await Promise.all(waits);clearTimeout(timer);await lock?.close();if(lock)await unlink(join(privateDir,'runner.lock')).catch(()=>{});await saveJSON('runner.json',{running:false,stoppedAt:new Date().toISOString()});process.exit(0);}
function launch(cwd,args,env,backend){const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});child.retailBackend=backend;children.push(child);for(const stream of [child.stdout,child.stderr]){let pending='';stream.on('data',chunk=>{pending+=chunk.toString();let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at+1);pending=pending.slice(at+1);appendFile(join(privateDir,'logs',backend?'backend.log':'frontend.log'),sanitize(line,config)).catch(()=>{});}});}child.on('error',()=>stop());child.on('exit',()=>{if(!closing)stop();});return child;}
async function main(){
  config=await settings();await mkdir(join(privateDir,'logs'),{recursive:true});
  lock=await open(join(privateDir,'runner.lock'),'wx');await lock.writeFile(String(process.pid));
  const pool=createPool(config.env.DATABASE_URL);try{const current=await inspect(pool),state=await readJSON('setup-state.json',null);if(!state?.complete||current.oid!==state.databaseOid||state.host!==config.url.hostname||state.port!==(config.url.port||'5432')||!current.compatible)throw Error('Inspect and initialize the exact Developer database first; startup never migrates or seeds.');}finally{await pool.end();}
  await available(config.port);await available(config.uiPort);
  const token=randomBytes(32).toString('hex');server=net.createServer(socket=>{let data='';socket.setTimeout(3000,()=>socket.destroy());socket.on('data',chunk=>{data+=chunk;if(data.length>1000)socket.destroy();});socket.on('end',()=>{try{const message=JSON.parse(data);if(message.token===token&&message.action==='stop')void stop();}catch{}});});server.listen(pipe);await once(server,'listening');
  const env=childEnvironment(config);launch(join(root,'backend'),['src/server.js'],env,true);
  const frontEnv={...env};delete frontEnv.DATABASE_URL;delete frontEnv.RETAIL_ACTIVATION_PUBLIC_KEY;delete frontEnv.RETAIL_RUNTIME_DIR;
  launch(join(root,'frontend'),['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(config.uiPort),'--strictPort','--mode','developer'],frontEnv,false);
  await saveJSON('runner.json',{running:true,pid:process.pid,token,origin:config.origin,backend:`http://127.0.0.1:${config.port}`,startedAt:new Date().toISOString()});
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
main().catch(async error=>{await saveJSON('last-start-error.json',{at:new Date().toISOString(),message:config?sanitize(error.message,config):'Developer settings unavailable',code:error.code??null});if(lock)await stop();else process.exit(1);});
