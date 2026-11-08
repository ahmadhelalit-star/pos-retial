import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function check(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=`${directory}/${entry.name}`;if(entry.isDirectory())await check(path);else if(entry.name.endsWith('.js')){const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exitCode=1;}}}}
await check('src');await check('scripts');await check('tests');await check('../shared');
if(!process.exitCode)console.log('Backend JavaScript syntax checks passed');
