import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile,rename } from 'node:fs/promises';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),configPath=resolve(process.argv[2]??join(process.env.PROGRAMDATA,'Sham Touch','Retail Server','server-private.json'));
const run=promisify(execFile),script=join(root,'desktop/windows/Private-Config.ps1');
const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Action','Read','-Path',configPath],{windowsHide:true,maxBuffer:1024*1024});
const config=JSON.parse(stdout);if(config.product!=='sham-touch-retail')throw Error('Wrong server configuration product');
Object.assign(process.env,config.environment,{RETAIL_FRONTEND_DIR:join(root,'frontend/dist')});
globalThis.retailSwitchDatabase=async(databaseUrl,maintenanceUrl)=>{
  const next={...config,environment:{...config.environment,DATABASE_URL:databaseUrl,RETAIL_MAINTENANCE_URL:maintenanceUrl}},temporary=configPath+'.next';
  // Plaintext is piped to DPAPI; credentials never appear in a command line or an intermediate file.
  const {spawn}=await import('node:child_process');await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Action','Write','-Path',temporary],{windowsHide:true,stdio:['pipe','ignore','pipe']});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Unable to protect replacement configuration')));child.stdin.end(JSON.stringify(next));});
  await writeFile(configPath+'.previous',await(await import('node:fs/promises')).readFile(configPath),{mode:0o600});await rename(temporary,configPath);
};
await import('../backend/src/server.js');
