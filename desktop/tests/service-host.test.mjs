import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createConnection,createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createPool } from '../../backend/src/db/pool.js';
import { migrate } from '../../backend/src/db/migrate.js';
test('backend host isolates duplicate instances, stops gracefully and recovers after crash',async()=>{
  assert.ok(process.env.TEST_DATABASE_URL);const url=new URL(process.env.TEST_DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/sham_touch_retail_.*test$/);const control=createPool(url.href),database=`sham_touch_retail_host_${randomUUID().replaceAll('-','')}_test`;await control.query(`CREATE DATABASE ${database}`);url.pathname='/'+database;const pool=createPool(url.href);await migrate(pool);await pool.end();
  const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const directory=resolve(process.env.TEST_ARTIFACT_DIR??'../work/desktop','host-'+randomUUID());await mkdir(directory,{recursive:true});const pipe='\\\\.\\pipe\\Retail-Test-'+randomUUID(),token=randomUUID(),env={...process.env,DATABASE_URL:url.href,PORT:String(port),HOST:'127.0.0.1',WEB_ORIGIN:`http://127.0.0.1:${port}`,RETAIL_RUNTIME_DIR:directory,RETAIL_CONTROL_PIPE:pipe,RETAIL_CONTROL_TOKEN:token};
  const start=()=>{const child=spawn(process.execPath,['src/server.js'],{cwd:resolve(process.env.TEST_SERVER_ROOT??'.','backend'),env,windowsHide:true,stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',value=>stderr+=value);child.stdout.resume();return {child,stderr:()=>stderr};};
  async function ready(){for(let index=0;index<100;index++){try{const response=await fetch(`http://127.0.0.1:${port}/api/health`);if(response.status===200)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Synthetic backend did not become healthy');}
  const command=value=>new Promise((resolve,reject)=>{const socket=createConnection(pipe,()=>socket.end(JSON.stringify({action:'stop',token:value})));socket.on('error',reject);socket.on('close',resolve);});let current;
  try{
    current=start();await ready();const duplicate=start(),[duplicateCode]=await once(duplicate.child,'exit');assert.notEqual(duplicateCode,0);assert.match(duplicate.stderr(),/Another Retail server/);await command('wrong-token');assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status,200);
    const exit=once(current.child,'exit');await command(token);assert.equal((await exit)[0],0);
    current=start();await ready();const crashed=once(current.child,'exit');current.child.kill('SIGKILL');await crashed;current=start();await ready();assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status,200);const stopped=once(current.child,'exit');current.child.stdin.end('stop\n');assert.equal((await stopped)[0],0);
  }finally{if(current&&!current.child.killed&&current.child.exitCode===null)current.child.kill();await control.end();}
});
