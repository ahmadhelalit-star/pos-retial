import { readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import protocol from '../../activation-bridge/retail.cjs';
import { randomUUID } from 'node:crypto';
const root=process.env.TEST_ARTIFACT_DIR,issuer=process.env.TEST_ISSUER_URL??'http://127.0.0.1:4134',retail=process.env.TEST_BASE_URL??'http://127.0.0.1:5190';
if(!root||!process.env.TEST_ISSUER_PASSWORD)throw new Error('Explicit synthetic fixture and password required');
const fixture=JSON.parse(await readFile(join(root,'phase3-ui-fixture.json'),'utf8'));
const request=await fetch(`${retail}/api/offline-activation/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Synthetic Portable Verification',phone:'123456789'})});const payload=await request.json();
if(!request.ok)throw new Error('Device request failed');
const response=await fetch(`${issuer}/api/retail/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestCode:payload.requestCode,validityDays:30,features:{advancedSales:true},keyPassword:process.env.TEST_ISSUER_PASSWORD})});const issued=await response.json();if(!response.ok)throw new Error('Portable issuer failed');
const publicKey=await readFile(fixture.publicKeyPath,'utf8');protocol.verifyRetailCode(issued.activationCode,publicKey);
let restaurantRejected=false;try{protocol.legacy.verifyActivationCode(issued.activationCode,publicKey);}catch{restaurantRejected=true;}
if(!restaurantRejected)throw new Error('Cross-product isolation failed');await writeFile(join(root,'portable-retail-code.txt'),issued.activationCode);
async function issueRetail(terms){const response=await fetch(`${issuer}/api/retail/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestCode:payload.requestCode,validityDays:30,keyPassword:process.env.TEST_ISSUER_PASSWORD,...terms})});if(response.status!==201)throw Error('Portable revision failed');const result=await response.json();protocol.verifyRetailCode(result.activationCode,publicKey);return result;}
const changed=await issueRetail({issueType:'FEATURE_CHANGE',previousActivationCode:issued.activationCode,features:{advancedReports:true}});if(changed.license.expiresAt!==issued.license.expiresAt)throw Error('Feature change extended expiry');
const renewed=await issueRetail({issueType:'RENEWAL',previousActivationCode:changed.activationCode,features:{advancedReports:true}});if(Date.parse(renewed.license.expiresAt)!==Date.parse(issued.license.expiresAt)+30*86400000)throw Error('Renewal lost paid days');
const restaurantRequest=await protocol.legacy.createActivationRequest({name:'Synthetic compatibility',phone:'123456789'},{collectDeviceInfo:async()=>({smbiosUuid:randomUUID(),computerName:'SYNTHETIC'})});
const restaurantResponse=await fetch(`${issuer}/api/activation/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestCode:restaurantRequest.requestCode,validityDays:30,keyPassword:process.env.TEST_ISSUER_PASSWORD})});if(restaurantResponse.status!==201)throw Error('Legacy issuance endpoint failed');const restaurantCode=(await restaurantResponse.json()).data.activationCode;protocol.legacy.verifyActivationCode(restaurantCode,publicKey);let retailRejected=false;try{protocol.verifyRetailCode(restaurantCode,publicKey);}catch{retailRejected=true;}if(!retailRejected)throw Error('Retail accepted restaurant code');
console.log(JSON.stringify({windowsPortableIssuedRetail:true,retailSignatureVerified:true,restaurantRejectedRetail:true,retailRejectedRestaurant:true,legacyIssuanceEndpointPassed:true,featureChangeRetainsExpiry:true,renewalRetainsPaidDays:true,productionKeysUsed:false}));
