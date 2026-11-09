import { mkdir,writeFile,rename,readFile,unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export async function atomicJSON(path,value){await mkdir(dirname(path),{recursive:true});const temporary=`${path}.${randomUUID()}.tmp`;await writeFile(temporary,JSON.stringify(value,null,2),{mode:0o600,flag:'wx'});try{for(let attempt=0;;attempt++){try{await rename(temporary,path);break;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=9)throw error;await new Promise(resolve=>setTimeout(resolve,10*(attempt+1)));}}}catch(error){await unlink(temporary).catch(()=>{});throw error;}}
export async function readJSON(path,fallback){try{return JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
