import {registerLocalLogin} from './modules/local-login.js';
import {unitLabelReplacer} from '../../shared/unitNames.js';
import {readFileSync} from 'node:fs';
import {createAdminRecovery} from './modules/admin-recovery.service.js';
import { registerInitialSetup,setupState } from './modules/initial-setup.js';
import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { apiRoutes } from './http/routes.js';
import { errorHandler,fail } from './http/errors.js';
import { unconfiguredLicense } from './modules/registry.js';
import { z } from 'zod';
import { operationRoutes } from './operations/routes.js';
import {authenticate,requirePermission} from './modules/auth.service.js';
export function createApp({pool,config,activationService,operations,localPrinting,licenseProvider=activationService?.status??unconfiguredLicense,logger=console.log}) {
  const app=express();app.set('json replacer',unitLabelReplacer);app.disable('x-powered-by');app.use(helmet());
  app.use((req,res,next)=>{
    req.requestId=randomUUID();res.setHeader('X-Request-Id',req.requestId);res.setHeader('Cache-Control','no-store');
    res.on('finish',()=>logger(JSON.stringify({event:'request',requestId:req.requestId,method:req.method,path:req.path,status:res.statusCode})));
    if(req.headers.origin && req.headers.origin!==config.origin)fail(403,'ORIGIN_DENIED','Origin not allowed');
    if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',config.origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,Idempotency-Key,X-Retail-Data-Epoch,X-Retail-Setup-Token');res.sendStatus(204);return;}
    next();
  });
  app.use(express.json({limit:'5mb',strict:true}));
  if(operations)app.use(operations.maintenance.middleware);
  app.get('/api/health',async(_req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',product:'retail',mode:'commercial-testing',productionReady:false,epoch:config.dataEpoch});});
  app.get('/api/offline-activation/status',async(_req,res)=>{const license=await licenseProvider(),setup=license.status==='ACTIVE'&&license.activated===true?await setupState(pool):null;res.json({...license,enforced:Boolean(activationService),setupRequired:setup?.required??false,setupBlocked:setup?.blocked??false});});
  registerInitialSetup(app,{pool,config,licenseProvider});
  registerLocalLogin(app,{pool,licenseProvider});
  if(activationService){
    app.get('/api/offline-activation/current-request',authenticate(pool),requirePermission('organization.manage'),async(req,res)=>{if(!req.user.roles.some(role=>role.is_admin))fail(403,'ADMIN_REQUIRED','Admin required');res.json(await activationService.currentRequest());});
    const attempts=new Map();
    app.use('/api/offline-activation',(req,_res,next)=>{if(req.method!=='POST')return next();const current=attempts.get(req.ip),time=Date.now();if(current&&time-current.since<60000&&current.count>=20)fail(429,'ACTIVATION_THROTTLED','Wait before retrying activation');attempts.set(req.ip,current&&time-current.since<60000?{...current,count:current.count+1}:{since:time,count:1});if(attempts.size>2000)attempts.clear();next();});
    app.post('/api/offline-activation/request',async(req,res)=>res.json(await activationService.request(z.object({name:z.string().min(2).max(100),phone:z.string().min(5).max(30)}).strict().parse(req.body))));
    app.post('/api/offline-activation/activate',async(req,res)=>res.json(await activationService.activate(z.object({activationCode:z.string().min(1).max(16384)}).strict().parse(req.body).activationCode)));
  }
  if(activationService&&config.activationPublicKeyPath){
    const recovery=createAdminRecovery({pool,licenseProvider,publicKey:readFileSync(config.activationPublicKeyPath,'utf8')});let count=0,since=Date.now();
    app.use('/api/admin-recovery',(req,_res,next)=>{if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip)||req.headers.origin!==config.origin)fail(403,'LOCAL_RECOVERY_ONLY','Use recovery on the local Retail server');if(Date.now()-since>60000){since=Date.now();count=0;}if(++count>10)fail(429,'RECOVERY_THROTTLED','Wait before retrying');next();});
    app.post('/api/admin-recovery/request',async(req,res)=>res.json(await recovery.request(z.union([z.object({username:z.string().min(3).max(80)}).strict(),z.object({userId:z.string().uuid()}).strict()]).parse(req.body))));
    app.post('/api/admin-recovery/reset',async(req,res)=>res.json(await recovery.apply(req.body)));
  }
  if(localPrinting)app.use('/api/local',authenticate(pool),async(req,_res,next)=>{const state=await licenseProvider();if(state.status!=='ACTIVE')fail(403,'ACTIVATION_REQUIRED','Activate Retail first');next();},localPrinting.router);
  app.use('/api/operations',operationRoutes({pool,operations}));
  app.use('/api',apiRoutes({pool,config,licenseProvider,activationService}));
  if(config.frontendDirectory){app.use(express.static(config.frontendDirectory,{index:false}));app.get(/^(?!\/api(?:\/|$)).*/,(_req,res)=>res.sendFile('index.html',{root:config.frontendDirectory}));}
  app.use((_req,_res)=>fail(404,'NOT_FOUND','Endpoint not found'));
  app.use(errorHandler);return app;
}
