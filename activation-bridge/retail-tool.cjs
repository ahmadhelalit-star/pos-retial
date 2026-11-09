const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const protocol=require('./retail.cjs');
const recovery=require('./retail-recovery.cjs');
const {createRetailRecords}=require('./retail-records.cjs');
const {resolveActivationToolPaths,createSigningKeyProvider}=require('./vendor/src');
const page=()=>fs.readFileSync(path.join(__dirname,'issuer-ui','retail.html'),'utf8');
function wrap(exports){
  const original=exports.createActivationToolServer;
  exports.createActivationToolServer=function(options={}){
    const server=original(options),listeners=server.listeners('request'),paths=resolveActivationToolPaths(options);
    const records=createRetailRecords(paths);
    const configFile=path.join(paths.dataDirectory,'retail-issuer-config.json');
    const retailConfig=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):null;
    if(retailConfig&&(retailConfig.version!==1||!path.isAbsolute(retailConfig.privateKeyPath)||!['developer-test','operator'].includes(retailConfig.profile)))throw Error('Invalid local Retail issuer configuration');
    const provider=options.retailSigningKeyProvider||(retailConfig?createSigningKeyProvider({privateKeyPath:retailConfig.privateKeyPath}):options.signingKeyProvider||(options.loadSigningKey?{load:options.loadSigningKey}:createSigningKeyProvider({privateKeyPath:paths.privateKeyPath})));
    const keyLabel=retailConfig?.profile==='developer-test'?'Developer test key · Retail only':'Retail signing key';
    function loadRetailKey(passphrase){
      // Retail validates the encrypted PEM on every signing request, independently of Restaurant's session cache.
      if(provider.privateKeyPath)return createSigningKeyProvider({privateKeyPath:provider.privateKeyPath}).load(passphrase);
      if(provider.describe?.().encrypted)throw Error('RETAIL_PASSWORD_POLICY_UNAVAILABLE');
      return provider.load(passphrase);
    }

    server.removeAllListeners('request');server.on('request',async(req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname!=='/retail'&&!url.pathname.startsWith('/api/retail/')){for(const listener of listeners)listener(req,res);return;}
      const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
      try{
        if(!exports.isAllowedLocalHost(req.headers.host)||(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host))return json(403,{error:{message:'Local issuer origin required'}});
        if(req.method==='GET'&&url.pathname==='/api/retail/config'){const state=provider.describe?.()??{configured:true,encrypted:false,unlocked:true};json(200,{configured:state.configured,encrypted:state.encrypted,unlocked:false,passwordRequired:Boolean(state.encrypted),keyLabel});return;}
        if(req.method==='GET'&&url.pathname==='/retail'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(page());return;}
        if(req.method==='POST'&&url.pathname==='/api/retail/recovery/request/decode'){const body=await exports.readJsonBody(req);json(200,{request:recovery.decodeRecoveryRequestCode(body.requestCode)});return;}
        if(req.method==='POST'&&url.pathname==='/api/retail/recovery/generate'){const body=await exports.readJsonBody(req),request=recovery.decodeRecoveryRequestCode(body.requestCode);if(Date.now()-Date.parse(request.createdAt)>3600000||Date.parse(request.createdAt)>Date.now()+120000)throw Error('Expired request');const result=recovery.createRecoveryCode(request,loadRetailKey(body.keyPassword));json(201,result);return;}
        if(req.method==='GET'&&url.pathname==='/api/retail/records'){json(200,records.list(url.searchParams));return;}
        if(req.method==='POST'&&url.pathname==='/api/retail/records/backup'){await exports.readJsonBody(req);json(201,records.backup());return;}
        const match=url.pathname.match(/^\/api\/retail\/records\/([a-f0-9-]{36})$/);
        if(match&&req.method==='GET'){json(200,records.detail(match[1]));return;}
        if(match&&req.method==='PATCH'){json(200,records.update(match[1],await exports.readJsonBody(req)));return;}
        if(req.method==='POST'&&url.pathname==='/api/retail/generate'){
          const body=await exports.readJsonBody(req),request=protocol.legacy.decodeRequestCode(body.requestCode);
          if(request.product!=='retail'||request.retailVersion!==1)throw Error('WRONG_PRODUCT');
          const result=protocol.createRetailCode(request,{validityDays:body.validityDays,issueType:body.issueType,previousActivationCode:body.previousActivationCode,features:body.features??{}},loadRetailKey(body.keyPassword));
          fs.mkdirSync(paths.dataDirectory,{recursive:true});fs.appendFileSync(path.join(paths.dataDirectory,'retail-issued.jsonl'),JSON.stringify({id:crypto.randomUUID(),issuedAt:new Date().toISOString(),request,issueType:body.issueType??'INITIAL',...result})+'\n',{mode:0o600});json(201,result);return;
        }
        json(404,{error:{message:'Retail issuer endpoint not found'}});
      }catch(error){
        const messages={
          RETAIL_PASSWORD_POLICY_UNAVAILABLE:'تعذر التحقق المستقل من كلمة مرور مفتاح Retail. راجع إعداد المفتاح.',
          PRIVATE_KEY_PATH_REQUIRED:'مفتاح توقيع Retail غير مضبوط. اربط المفتاح من إعداد الأداة المحلي.',
          PRIVATE_KEY_NOT_FOUND:'ملف مفتاح توقيع Retail غير موجود. راجع إعداد المفتاح المحلي.',
          PRIVATE_KEY_READ_FAILED:'تعذر قراءة مفتاح توقيع Retail. تحقق من صلاحيات الملف.',
          PRIVATE_KEY_PASSWORD_REQUIRED:'أدخل كلمة مرور مفتاح التوقيع في خانة Signing Key Password.',
          INVALID_PRIVATE_KEY_PASSWORD:'كلمة مرور مفتاح التوقيع غير صحيحة. أعد إدخالها.',
          INVALID_PRIVATE_KEY:'ملف مفتاح التوقيع غير صالح.',INVALID_PRIVATE_KEY_TYPE:'يجب استخدام مفتاح توقيع Ed25519.',
          WRONG_PRODUCT:'هذا الطلب ليس طلب Retail. انسخ كود الطلب من صفحة تسجيل Sham Touch Retail.',
          INVALID_REQUEST_PREFIX:'صيغة كود الطلب غير صحيحة. الصق كود طلب التفعيل كاملًا.',
          INVALID_REQUEST_CODE:'كود الطلب غير صالح أو غير مكتمل.',CORRUPTED_REQUEST_CODE:'كود الطلب غير مكتمل أو تغير أثناء النسخ.',
          INVALID_ISSUE_TYPE:'اختر نوع إصدار صالحًا.',INVALID_VALIDITY_DAYS:'مدة الاشتراك يجب أن تكون عددًا صحيحًا ضمن المدة المسموحة.',
          INVALID_ACTIVATION_CODE:'كود التفعيل السابق غير صالح أو غير مكتمل.',INVALID_RETAIL_SIGNATURE:'الكود السابق غير موقّع بمفتاح Retail الحالي.',
          PREVIOUS_DEVICE_MISMATCH:'كود التفعيل السابق يعود لجهاز آخر.',REVISION_NOT_NEWER:'انتظر لحظة ثم أعد الإصدار؛ يجب أن يكون الإصدار الجديد أحدث من السابق.',
          RENEW_EXPIRED_LICENSE_FIRST:'الترخيص السابق منتهٍ؛ اختر Renewal أولًا.',PERPETUAL_RENEWAL:'الترخيص الدائم لا يحتاج تجديدًا.',
          INVALID_RECOVERY_REQUEST_PREFIX:'استخدم طلب استعادة Retail، وليس طلب تفعيل أو استعادة المطاعم.',
          INVALID_RECOVERY_REQUEST:'طلب الاستعادة غير صالح أو غير مكتمل.',
          'Expired request':'طلب الاستعادة منتهٍ. أنشئ طلبًا جديدًا من Retail.',
          'Record not found':'سجل التفعيل غير موجود.', 'Invalid metadata':'الحالة أو الملاحظات غير صالحة.', 'Invalid filters':'خيارات البحث أو الصفحة غير صالحة.'
        };
        const code=Object.hasOwn(messages,error.code)?error.code:Object.hasOwn(messages,error.message)?error.message:'RETAIL_OPERATION_FAILED';
        json(['PRIVATE_KEY_PATH_REQUIRED','PRIVATE_KEY_NOT_FOUND','PRIVATE_KEY_READ_FAILED'].includes(code)?503:400,{error:{code,message:messages[code]??'تعذر إكمال العملية. تحقق من الطلب وإعداد مفتاح Retail، ثم أعد المحاولة.'}});
      }
    });return server;
  };return exports;
}
module.exports={wrap};
