import { randomBytes,createHmac,createHash,timingSafeEqual,createPublicKey } from 'node:crypto';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import protocol from '../../../activation-bridge/retail.cjs';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';

export async function createActivationService({pool,publicKey,integrityPath,collectDeviceInfo=protocol.legacy.collectWindowsDeviceInfo,now=()=>new Date(),monotonicNow=()=>performance.now()}){
  let key;
  if(!integrityPath)throw new Error('Retail integrity state path required');
  await mkdir(dirname(integrityPath),{recursive:true});
  try{key=await readFile(integrityPath);}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(integrityPath,randomBytes(32),{flag:'wx',mode:0o600});key=await readFile(integrityPath);}
  if(key.length!==32)throw new Error('Invalid integrity key');
  const publicKeyObject=createPublicKey(publicKey),started=+now(),tick=monotonicNow();
  const mac=state=>createHmac('sha256',key).update(JSON.stringify(Object.fromEntries(Object.entries(state).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
  const codeHash=code=>createHash('sha256').update(code).digest('hex');
  let hardware;
  async function device(){hardware??=await collectDeviceInfo();return hardware;}
  function fingerprint(source,info){return protocol.legacy.createFingerprint(protocol.legacy.selectHardwareIdentifierBySource(info,source).normalized);}
  async function status(){
    return transaction(pool,async db=>{
      await db.query("SELECT pg_advisory_xact_lock(hashtext('retail:activation'))");
      const row=(await db.query('SELECT * FROM retail_activation WHERE id=1')).rows[0];
      if(!row?.code)return {status:'NOT_ACTIVATED',activated:false,product:'retail',features:{}};
      try{
        const expected=mac(row.state);
        if(!row.mac||row.mac.length!==expected.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(row.mac)))return {status:'INVALID_LICENSE',activated:false};
        const license=protocol.verifyRetailCode(row.code,publicKeyObject),time=+now();
        if(row.state.codeHash!==codeHash(row.code)||row.state.licenseId!==license.licenseId)return {status:'INVALID_LICENSE',activated:false};
        if(fingerprint(license.fingerprintSource,await device())!==license.fingerprintHash)return {status:'DEVICE_MISMATCH',activated:false};
        if(time<Number(row.state.lastSeen)-120000||time<started+(monotonicNow()-tick)-120000||time<Date.parse(license.revisionAt??license.issuedAt)-120000)return {status:'CLOCK_ROLLBACK',activated:false};
        const state={...row.state,lastSeen:Math.max(time,Number(row.state.lastSeen))};
        await db.query('UPDATE retail_activation SET state=$1,mac=$2,updated_at=now() WHERE id=1',[state,mac(state)]);
        if(license.expiresAt!==null&&time>=Date.parse(license.expiresAt))return {status:'EXPIRED',activated:false,expiresAt:license.expiresAt};
        return {status:'ACTIVE',activated:true,product:'retail',features:license.features,expiresAt:license.expiresAt,licenseId:license.licenseId,maxClients:license.maxClients??0};
      }catch{return {status:'INVALID_LICENSE',activated:false};}
    });
  }
  async function request(input){
    const result=await protocol.createRetailRequest(input,{collectDeviceInfo:device,now});
    await transaction(pool,async db=>{
      await db.query("SELECT pg_advisory_xact_lock(hashtext('retail:activation'))");
      await db.query('INSERT INTO retail_activation(id,request) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET request=excluded.request',[result.request]);
    });return {requestCode:result.requestCode};
  }
  async function activate(code){
    let license;try{license=protocol.verifyRetailCode(code,publicKeyObject);}catch{fail(400,'INVALID_LICENSE','Retail activation code signature or product is invalid');}
    const time=+now();if(license.expiresAt!==null&&time>=Date.parse(license.expiresAt))fail(400,'EXPIRED','License expired');
    if(time<Date.parse(license.revisionAt??license.issuedAt)-120000||time<started+(monotonicNow()-tick)-120000)fail(400,'CLOCK_ROLLBACK','Correct the device clock');
    if(fingerprint(license.fingerprintSource,await device())!==license.fingerprintHash)fail(400,'DEVICE_MISMATCH','License is bound to another server');
    await transaction(pool,async db=>{
      await db.query("SELECT pg_advisory_xact_lock(hashtext('retail:activation'))");
      const previous=(await db.query('SELECT * FROM retail_activation WHERE id=1')).rows[0];
      if(previous?.request?.requestId!==license.requestId)fail(400,'REQUEST_MISMATCH','Generate a current device request before activation');
      if(previous?.code){
        if(previous.mac!==mac(previous.state)||previous.state.codeHash!==codeHash(previous.code))fail(409,'STATE_REVIEW_REQUIRED','Existing license integrity needs review');
        try{const old=protocol.verifyRetailCode(previous.code,publicKeyObject);if(Date.parse(license.revisionAt??license.issuedAt)<=Date.parse(old.revisionAt??old.issuedAt)&&code!==previous.code)fail(409,'LICENSE_DOWNGRADE','Older licenses cannot replace a newer issue');}catch(error){if(error.status)throw error;fail(409,'STATE_REVIEW_REQUIRED','Existing license state needs review');}
      }
      if(previous?.state?.lastSeen>time+120000)fail(400,'CLOCK_ROLLBACK','Correct the device clock');
      const state={licenseId:license.licenseId,codeHash:codeHash(code),lastSeen:time,activatedAt:time};
      await db.query('UPDATE retail_activation SET code=$1,state=$2,mac=$3,updated_at=now() WHERE id=1',[code,state,mac(state)]);
    });return status();
  }
  return {status,request,activate};
}
