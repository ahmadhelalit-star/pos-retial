const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const protocol=require('./retail.cjs');
const {resolveActivationToolPaths,createSigningKeyProvider}=require('./vendor/src');
const page=()=>`<!doctype html><meta charset="utf-8"><title>Sham Touch Activation · Retail</title><style>body{font:16px Arial;max-width:760px;margin:35px auto;padding:15px;background:#f5f7fb}textarea{width:100%;height:130px}input,button{padding:10px;margin:8px}fieldset{border:1px solid #ccd5e2}label{display:inline-block;margin:8px}</style><h1>Sham Touch Activation · Retail</h1><p>Review candidate · Restaurant issuance remains unchanged. <a href="/">Restaurant tool</a></p><form id="form"><label>Retail Request Code<textarea id="request" required></textarea></label><label>Issue type<select id="issue"><option value="INITIAL">Initial</option><option value="RENEWAL">Renew · retain paid days</option><option value="FEATURE_CHANGE">Features · retain expiry</option></select></label><label>Previous Retail activation code<textarea id="previous"></textarea></label><label>Subscription days<input id="days" type="number" value="365" min="1" max="3650" required></label><label>Key password<input id="password" type="password" autocomplete="off"></label><fieldset><legend>Licensed modules</legend>${protocol.FEATURES.map(name=>`<label><input type="checkbox" value="${name}" class="feature">${name}</label>`).join('')}</fieldset><button>Issue Retail activation code</button></form><p id="message"></p><textarea id="result" readonly></textarea><script>document.querySelector('#form').onsubmit=async event=>{event.preventDefault();const features=Object.fromEntries([...document.querySelectorAll('.feature')].map(input=>[input.value,input.checked]));try{const response=await fetch('/api/retail/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestCode:document.querySelector('#request').value.trim(),validityDays:Number(document.querySelector('#days').value),issueType:document.querySelector('#issue').value,previousActivationCode:document.querySelector('#previous').value.trim(),features,keyPassword:document.querySelector('#password').value})});const data=await response.json();if(!response.ok)throw Error(data.error.message);document.querySelector('#result').value=data.activationCode;document.querySelector('#message').textContent='Retail code issued. Expiry: '+data.license.expiresAt;document.querySelector('#password').value='';}catch(error){document.querySelector('#message').textContent=error.message;}};</script>`;
function wrap(exports){
  const original=exports.createActivationToolServer;
  exports.createActivationToolServer=function(options={}){
    const server=original(options),listeners=server.listeners('request'),paths=resolveActivationToolPaths(options);
    const provider=options.signingKeyProvider||(options.loadSigningKey?{load:options.loadSigningKey}:createSigningKeyProvider({privateKeyPath:paths.privateKeyPath}));
    server.removeAllListeners('request');server.on('request',async(req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname!=='/retail'&&!url.pathname.startsWith('/api/retail/')){for(const listener of listeners)listener(req,res);return;}
      const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
      try{
        if(!exports.isAllowedLocalHost(req.headers.host)||(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host))return json(403,{error:{message:'Local issuer origin required'}});
        if(req.method==='GET'&&url.pathname==='/retail'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(page());return;}
        if(req.method==='POST'&&url.pathname==='/api/retail/generate'){
          const body=await exports.readJsonBody(req),request=protocol.legacy.decodeRequestCode(body.requestCode);
          const result=protocol.createRetailCode(request,{validityDays:body.validityDays,issueType:body.issueType,previousActivationCode:body.previousActivationCode,features:body.features??{}},provider.load(body.keyPassword));
          fs.mkdirSync(paths.dataDirectory,{recursive:true});fs.appendFileSync(path.join(paths.dataDirectory,'retail-issued.jsonl'),JSON.stringify({id:crypto.randomUUID(),issuedAt:new Date().toISOString(),...result})+'\n',{mode:0o600});json(201,result);return;
        }
        json(404,{error:{message:'Retail issuer endpoint not found'}});
      }catch{json(400,{error:{message:'Retail issuance failed. Check request, terms and signing key password.'}});}
    });return server;
  };return exports;
}
module.exports={wrap};
