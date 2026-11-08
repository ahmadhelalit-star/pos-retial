import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import protocol from '../../activation-bridge/retail.cjs';
import { OPTIONAL_MODULES } from '../../shared/features.js';
const device={smbiosUuid:'550e8400-e29b-41d4-a716-446655440000',computerName:'Synthetic'};
const keys=generateKeyPairSync('ed25519');
test('Retail signed namespace is mutually exclusive with unchanged restaurant verifier',async()=>{
  const request=await protocol.createRetailRequest({name:'Retail Test',phone:'123456789'},{collectDeviceInfo:async()=>device});
  const result=protocol.createRetailCode(request.request,{validityDays:30,features:{advancedSales:true}},keys.privateKey);
  assert.equal(protocol.verifyRetailCode(result.activationCode,keys.publicKey).product,'retail');
  assert.throws(()=>protocol.legacy.verifyActivationCode(result.activationCode,keys.publicKey));
  const old=await protocol.legacy.createActivationRequest({name:'Restaurant',phone:'123456789'},{collectDeviceInfo:async()=>device});
  const restaurant=protocol.issueCompatible(old.request,{validityDays:30},keys.privateKey);
  assert.equal(protocol.legacy.verifyActivationCode(restaurant.activationCode,keys.publicKey).requestId,old.request.requestId);
  assert.throws(()=>protocol.verifyRetailCode(restaurant.activationCode,keys.publicKey));
  assert.throws(()=>protocol.verifyRetailCode(result.activationCode.slice(0,-2)+'aa',keys.publicKey));
  assert.deepEqual(protocol.FEATURES,OPTIONAL_MODULES);
});
test('Retail feature revisions preserve expiry and renewal retains remaining paid days',async()=>{
  const request=(await protocol.createRetailRequest({name:'Revision test',phone:'123456789'},{collectDeviceInfo:async()=>device})).request;
  const first=protocol.createRetailCode(request,{validityDays:30},keys.privateKey,{now:()=>new Date('2026-01-01T00:00:00Z')});
  const features=protocol.createRetailCode(request,{validityDays:365,issueType:'FEATURE_CHANGE',previousActivationCode:first.activationCode,features:{advancedSales:true}},keys.privateKey,{now:()=>new Date('2026-01-10T00:00:00Z')});
  assert.equal(features.license.expiresAt,first.license.expiresAt);assert.equal(features.license.validityDays,30);assert.equal(protocol.verifyRetailCode(features.activationCode,keys.publicKey).revisionAt,'2026-01-10T00:00:00.000Z');
  const renewed=protocol.createRetailCode(request,{validityDays:30,issueType:'RENEWAL',previousActivationCode:features.activationCode},keys.privateKey,{now:()=>new Date('2026-01-11T00:00:00Z')});
  assert.equal(renewed.license.expiresAt,'2026-03-02T00:00:00.000Z');assert.equal(renewed.license.validityDays,60);assert.throws(()=>protocol.legacy.verifyActivationCode(renewed.activationCode,keys.publicKey));
  assert.throws(()=>protocol.createRetailCode(request,{validityDays:30,issueType:'FEATURE_CHANGE',previousActivationCode:first.activationCode},keys.privateKey,{now:()=>new Date('2026-02-10T00:00:00Z')}));
  assert.throws(()=>protocol.createRetailCode({...request,fingerprintHash:'a'.repeat(64)},{validityDays:30,issueType:'RENEWAL',previousActivationCode:first.activationCode},keys.privateKey));
});
