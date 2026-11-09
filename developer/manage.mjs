import { spawn } from 'node:child_process';
import net from 'node:net';
import { readFile,unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { root,privateDir,pipe,settings,readJSON,sanitize } from './common.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function alive(pid){if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch{return false;}}
async function state(){const current=await readJSON('runner.json',null);return current?.running&&alive(current.pid)?current:null;}
async function healthy(config){try{const response=await fetch(config.origin+'/api/health',{signal:AbortSignal.timeout(1500)});return response.ok&&(await response.json()).product==='retail';}catch{return false;}}
async function main(){
  const command=process.argv[2],config=await settings(),current=await state();
  if(command==='status'){let license;try{if(current)license=await(await fetch(config.origin+'/api/offline-activation/status',{signal:AbortSignal.timeout(3000)})).json();}catch{}console.log(JSON.stringify({running:Boolean(current),healthy:current?await healthy(config):false,url:config.origin+'/inventory',database:'sham_retail_dev',databaseHost:config.url.hostname,databasePort:config.url.port||'5432',activation:license?.status??'UNKNOWN',expiresAt:license?.expiresAt??null}));return;}
  if(command==='stop'){
    if(!current){console.log('Retail Developer is stopped.');return;}
    await new Promise((resolve,reject)=>{const socket=net.createConnection(pipe,()=>socket.end(JSON.stringify({action:'stop',token:current.token})));socket.on('error',reject);socket.on('close',resolve);});
    for(let i=0;i<100;i++){if(!await state()){console.log('Retail Developer stopped; PostgreSQL and all data were preserved.');return;}await delay(150);}throw Error('Developer stop is still pending; review private logs.');
  }
  if(command!=='start')throw Error('Use start, stop or status.');
  if(current){if(await healthy(config)){console.log('Retail Developer already running: '+config.origin+'/inventory');return;}throw Error('Developer is running but unhealthy; review logs or stop it first.');}
  try{const lockPid=Number(await readFile(join(privateDir,'runner.lock'),'utf8'));if(alive(lockPid))throw Error('A Developer runner is already starting; retry status shortly.');await unlink(join(privateDir,'runner.lock'));}catch(error){if(error.code!=='ENOENT')throw error;}
  await unlink(join(privateDir,'last-start-error.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
  const child=spawn(process.execPath,[join(root,'developer/runner.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});child.unref();
  for(let i=0;i<100;i++){const failure=await readJSON('last-start-error.json',null);if(failure)throw Error(failure.message);const running=await state();if(running&&await healthy(config)){console.log('Retail Developer: '+config.origin+'/inventory');console.log('Stop: npm run dev:stop');return;}await delay(300);}
  throw Error('Startup did not finish; review .developer/logs. No other process was stopped.');
}
main().catch(async error=>{let config;try{config=await settings();}catch{}console.error(config?sanitize(error.message,config):error.message);process.exitCode=1;});
