import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./windows/Private-Config.ps1',import.meta.url)),'-Action','Read','-Path',process.argv[2]],{windowsHide:true});const config=JSON.parse(stdout);
await new Promise((resolve,reject)=>{const socket=createConnection(config.environment.RETAIL_CONTROL_PIPE??'\\\\.\\pipe\\ShamTouchRetailServer',()=>socket.end(JSON.stringify({token:config.environment.RETAIL_CONTROL_TOKEN,action:'stop'})));socket.setTimeout(10000,()=>socket.destroy(Error('Control timeout')));socket.on('close',resolve);socket.on('error',reject);});
