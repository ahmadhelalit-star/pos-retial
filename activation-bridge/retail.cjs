// Additive review candidate. Restaurant protocol sources in vendor/ are byte-for-byte references.
const crypto=require('node:crypto');
const legacy=require('./vendor/src/index.js');
const {toPrivateKey,toPublicKey}=require('./vendor/src/keyManager.js');
const FEATURES=Object.freeze(['advancedAccounting','advancedInventory','advancedPricing','advancedSales','advancedReports','multiBranch']);
const CONTEXT='POSACT1.RETAIL.V1';
async function createRetailRequest(input,options={}){
  const result=await legacy.createActivationRequest(input,options);
  const request={...result.request,product:'retail',retailVersion:1};
  return {request,requestCode:legacy.createRequestCode(request)};
}
function validateRetailLicense(payload){
  if(payload?.product!=='retail'||payload.retailVersion!==1)throw new Error('WRONG_PRODUCT');
  const {features,...core}=payload;legacy.assertValidLicensePayload(core);
  if(!features||typeof features!=='object'||Array.isArray(features)||Object.keys(features).some(key=>!FEATURES.includes(key))||Object.values(features).some(value=>typeof value!=='boolean'))throw new Error('INVALID_RETAIL_FEATURES');
  if(payload.revisionAt!==undefined&&(!Number.isFinite(Date.parse(payload.revisionAt))||Date.parse(payload.revisionAt)<Date.parse(payload.issuedAt)))throw new Error('INVALID_REVISION');
  return payload;
}
function createRetailCode(request,terms,privateKey,options={}){
  if(request?.product!=='retail'||request.retailVersion!==1)throw new Error('WRONG_PRODUCT');
  const {features={},issueType='INITIAL',previousActivationCode,...coreTerms}=terms;
  if(!['INITIAL','RENEWAL','FEATURE_CHANGE'].includes(issueType))throw new Error('INVALID_ISSUE_TYPE');
  const payload={...legacy.createLicensePayload(request,coreTerms,options),product:'retail',retailVersion:1,features};
  if(issueType!=='INITIAL'){
    const previous=verifyRetailCode(previousActivationCode,crypto.createPublicKey(toPrivateKey(privateKey))),revision=payload.issuedAt;
    if(previous.fingerprintHash!==request.fingerprintHash||previous.fingerprintSource!==request.fingerprintSource)throw new Error('PREVIOUS_DEVICE_MISMATCH');
    if(Date.parse(revision)<=Date.parse(previous.revisionAt??previous.issuedAt))throw new Error('REVISION_NOT_NEWER');
    if(issueType==='FEATURE_CHANGE'){
      if(previous.expiresAt!==null&&Date.parse(previous.expiresAt)<=Date.parse(revision))throw new Error('RENEW_EXPIRED_LICENSE_FIRST');
      Object.assign(payload,{issuedAt:previous.issuedAt,expiresAt:previous.expiresAt,validityDays:previous.validityDays,licenseType:previous.licenseType});
    }else{
      if(previous.expiresAt===null)throw new Error('PERPETUAL_RENEWAL');
      // Retain remaining paid days; an expired term starts again at issuance time.
      if(Date.parse(previous.expiresAt)>Date.parse(revision))Object.assign(payload,{issuedAt:previous.issuedAt,expiresAt:new Date(Date.parse(previous.expiresAt)+coreTerms.validityDays*86400000).toISOString(),validityDays:previous.validityDays+coreTerms.validityDays});
    }
    payload.revisionAt=revision;payload.previousLicenseId=previous.licenseId;
  }
  validateRetailLicense(payload);
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto.sign(null,Buffer.from(`${CONTEXT}.${encoded}`),toPrivateKey(privateKey)).toString('base64url');
  return {activationCode:`POSACT1-${encoded}.${signature}`,license:payload};
}
function verifyRetailCode(code,publicKey){
  if(typeof code!=='string'||code.length>16384||!code.startsWith('POSACT1-'))throw new Error('INVALID_ACTIVATION_CODE');
  const parts=code.slice(8).split('.');
  if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0])||!/^[A-Za-z0-9_-]{86}$/.test(parts[1]))throw new Error('INVALID_ACTIVATION_CODE');
  const bytes=Buffer.from(parts[0],'base64url'),signature=Buffer.from(parts[1],'base64url');
  if(bytes.toString('base64url')!==parts[0]||signature.toString('base64url')!==parts[1]||!crypto.verify(null,Buffer.from(`${CONTEXT}.${parts[0]}`),toPublicKey(publicKey),signature))throw new Error('INVALID_RETAIL_SIGNATURE');
  return validateRetailLicense(JSON.parse(bytes.toString('utf8')));
}
function issueCompatible(request,terms,key,options){return request.product==='retail'?createRetailCode(request,terms,key,options):legacy.createActivationCode(request,terms,key,options);}
module.exports={FEATURES,CONTEXT,legacy,createRetailRequest,createRetailCode,verifyRetailCode,issueCompatible};
