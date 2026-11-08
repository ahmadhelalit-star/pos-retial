import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { rename,copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const script=fileURLToPath(new URL('./windows/Private-Config.ps1',import.meta.url));
export async function readPrivate(path){const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Action','Read','-Path',path],{windowsHide:true,maxBuffer:1024*1024});return JSON.parse(stdout);}
export async function writePrivate(path,value){const temporary=path+'.next';await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Action','Write','-Path',temporary],{windowsHide:true,stdio:['pipe','ignore','pipe']});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('DPAPI configuration write failed')));child.stdin.end(JSON.stringify(value));});await copyFile(path,path+'.previous').catch(error=>{if(error.code!=='ENOENT')throw error;});await rename(temporary,path);}
