import { createHash,verify,createPublicKey } from 'node:crypto';
import { readFile,readdir,lstat } from 'node:fs/promises';
import { join,resolve,relative,sep } from 'node:path';
export const releaseVersion='0.4.0-rc.2';
export function compareVersions(a,b){const parse=value=>{const match=/^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(value);if(!match)throw Error('Unsupported Retail version');return [Number(match[1]),Number(match[2]),Number(match[3]),match[4]===undefined?Number.MAX_SAFE_INTEGER:Number(match[4])];};const left=parse(a),right=parse(b);for(let i=0;i<4;i++)if(left[i]!==right[i])return left[i]>right[i]?1:-1;return 0;}
export async function releaseFiles(directory){const files=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const full=join(path,entry.name);if((await lstat(full)).isSymbolicLink())throw Error('Release links are prohibited');if(entry.isDirectory())await walk(full);else{const name=relative(directory,full).split(sep).join('/');if(name==='release.json')continue;if(/(^|\/)(\.env|data|backups|secrets|logs|runtime-state|server-private\.json)(\/|$)/i.test(name))throw Error('Customer data or secrets cannot be packaged');const bytes=await readFile(full);files.push({path:name,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}await walk(directory);return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}
export async function verifyRelease(directory,publicKey,currentVersion){
  directory=resolve(directory);const signed=JSON.parse(await readFile(join(directory,'release.json'),'utf8')),payload=Buffer.from(signed.payload,'base64url');if(payload.toString('base64url')!==signed.payload||!verify(null,payload,createPublicKey(publicKey),Buffer.from(signed.signature,'base64url')))throw Error('Release signature is invalid');const manifest=JSON.parse(payload);
  if(manifest.product!=='sham-touch-retail'||manifest.channel!=='acceptance-candidate'||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Wrong release product or channel');compareVersions(manifest.version,manifest.version);if(currentVersion&&compareVersions(manifest.version,currentVersion)<0)throw Error('Unsafe program downgrade rejected');
  const actual=await releaseFiles(directory);if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Release contents do not match the signed manifest');return manifest;
}
export async function activateUpdate({directory,publicKey,currentVersion,stop,backup,stage,switchCode,start,health,rollback}){
  const release=await verifyRelease(directory,publicKey,currentVersion);let stopped=false,safety;
  try{await stop();stopped=true;safety=await backup();await stage(safety,release);await switchCode(release);await start();if(!await health())throw Error('Updated server health check failed');return {updated:true,version:release.version,safetyBackup:safety.name};}
  catch(error){if(stopped)await rollback({safety,error});throw error;}
}
