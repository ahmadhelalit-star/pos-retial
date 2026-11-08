import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { apiRoutes } from './http/routes.js';
import { errorHandler,fail } from './http/errors.js';
import { unconfiguredLicense } from './modules/registry.js';
import { z } from 'zod';
import { operationRoutes } from './operations/routes.js';
export function createApp({pool,config,activationService,operations,licenseProvider=activationService?.status??unconfiguredLicense,logger=console.log}) {
  const app=express();app.disable('x-powered-by');app.use(helmet());
  app.use((req,res,next)=>{
    req.requestId=randomUUID();res.setHeader('X-Request-Id',req.requestId);res.setHeader('Cache-Control','no-store');
    res.on('finish',()=>logger(JSON.stringify({event:'request',requestId:req.requestId,method:req.method,path:req.path,status:res.statusCode})));
    if(req.headers.origin && req.headers.origin!==config.origin)fail(403,'ORIGIN_DENIED','Origin not allowed');
    if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',config.origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,Idempotency-Key');res.sendStatus(204);return;}
    next();
  });
  app.use(express.json({limit:'5mb',strict:true}));
  if(operations)app.use(operations.maintenance.middleware);
  app.get('/api/health',async(_req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',product:'retail',mode:'commercial-testing',productionReady:false});});
  app.get('/api/offline-activation/status',async(_req,res)=>res.json({...await licenseProvider(),enforced:Boolean(activationService)}));
  if(activationService){
    const attempts=new Map();
    app.use('/api/offline-activation',(req,_res,next)=>{if(req.method!=='POST')return next();const current=attempts.get(req.ip),time=Date.now();if(current&&time-current.since<60000&&current.count>=20)fail(429,'ACTIVATION_THROTTLED','Wait before retrying activation');attempts.set(req.ip,current&&time-current.since<60000?{...current,count:current.count+1}:{since:time,count:1});if(attempts.size>2000)attempts.clear();next();});
    app.post('/api/offline-activation/request',async(req,res)=>res.json(await activationService.request(z.object({name:z.string().min(2).max(100),phone:z.string().min(5).max(30)}).strict().parse(req.body))));
    app.post('/api/offline-activation/activate',async(req,res)=>res.json(await activationService.activate(z.object({activationCode:z.string().min(1).max(16384)}).strict().parse(req.body).activationCode)));
  }
  app.use('/api/operations',operationRoutes({pool,operations}));
  app.use('/api',apiRoutes({pool,config,licenseProvider,activationService}));
  if(config.frontendDirectory){app.use(express.static(config.frontendDirectory,{index:false}));app.get(/^(?!\/api(?:\/|$)).*/,(_req,res)=>res.sendFile('index.html',{root:config.frontendDirectory}));}
  app.use((_req,_res)=>fail(404,'NOT_FOUND','Endpoint not found'));
  app.use(errorHandler);return app;
}
