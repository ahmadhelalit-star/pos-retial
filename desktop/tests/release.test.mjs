import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,sign,randomUUID } from 'node:crypto';
import { mkdir,writeFile,appendFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { releaseFiles,verifyRelease,activateUpdate } from '../release.mjs';
test('signed release rejects tampering, wrong key and unsafe downgrade before touching installation',async()=>{
  const directory=resolve(process.env.TEST_ARTIFACT_DIR??'../work/desktop','release-'+randomUUID());await mkdir(directory,{recursive:true});await writeFile(join(directory,'program.js'),'synthetic release');const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({type:'spki',format:'pem'}),payload=Buffer.from(JSON.stringify({product:'sham-touch-retail',channel:'acceptance-candidate',version:'0.4.0-rc.2',files:await releaseFiles(directory)}));await writeFile(join(directory,'release.json'),JSON.stringify({payload:payload.toString('base64url'),signature:sign(null,payload,keys.privateKey).toString('base64url')}));
  assert.equal((await verifyRelease(directory,publicKey,'0.4.0-rc.1')).version,'0.4.0-rc.2');await assert.rejects(verifyRelease(directory,publicKey,'0.4.1'));await assert.rejects(verifyRelease(directory,generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'})));
  const events=[];await assert.rejects(activateUpdate({directory,publicKey,currentVersion:'0.4.0-rc.1',stop:async()=>events.push('stop'),backup:async()=>({name:'verified-safety'}),stage:async()=>events.push('stage-new-database'),switchCode:async()=>events.push('switch'),start:async()=>events.push('start'),health:async()=>false,rollback:async()=>events.push('restore-previous-pointer-and-config')}));assert.deepEqual(events,['stop','stage-new-database','switch','start','restore-previous-pointer-and-config']);
  await appendFile(join(directory,'program.js'),'tampered');await assert.rejects(verifyRelease(directory,publicKey));let touched=false;await assert.rejects(activateUpdate({directory,publicKey,currentVersion:'0.4.0',stop:async()=>{touched=true;}}));assert.equal(touched,false);
});
