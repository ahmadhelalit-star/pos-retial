import { mkdir,writeFile,rename,readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export async function atomicJSON(path,value){await mkdir(dirname(path),{recursive:true});const temporary=`${path}.${randomUUID()}.tmp`;await writeFile(temporary,JSON.stringify(value,null,2),{mode:0o600,flag:'wx'});await rename(temporary,path);}
export async function readJSON(path,fallback){try{return JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
