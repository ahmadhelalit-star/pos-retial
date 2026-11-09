// Run this file from the already installed, trusted version before executing any staged code.
import { readFile } from 'node:fs/promises';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { verifyRelease } from './release.mjs';
const [baseArg,stageArg,mode]=process.argv.slice(2),base=resolve(baseArg),stage=resolve(stageArg),trusted=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pointer=JSON.parse(await readFile(join(base,'current.json'),'utf8'));
if(resolve(base,'versions',pointer.version)!==trusted)throw Error('Updater must run from the current installed version');
if(!stage.startsWith(join(base,'versions')+'\\')&&!stage.startsWith(join(base,'versions')+'/'))throw Error('Update must be staged inside Retail versions');
await verifyRelease(stage,await readFile(join(trusted,'release-public.pem'),'utf8'),pointer.version);
const child=spawn(join(stage,'runtime/node.exe'),[join(stage,'desktop/activate.mjs'),base,stage,mode],{windowsHide:true,stdio:'inherit'});
child.on('error',()=>process.exit(1));child.on('exit',code=>process.exit(code??1));
