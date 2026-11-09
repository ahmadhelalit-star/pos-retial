import {randomBytes} from 'node:crypto';
import {bootstrap} from './bootstrap.service.js';
import {fail} from '../http/errors.js';
export async function setupState(db){const row=(await db.query('SELECT EXISTS(SELECT 1 FROM companies) company,EXISTS(SELECT 1 FROM users) users')).rows[0];return {required:!row.company&&!row.users,blocked:row.company&&!row.users};}
export function registerInitialSetup(app,{pool,config,licenseProvider}){
 let token=randomBytes(32).toString('hex'),attempts=0,since=Date.now();
 const guard=async req=>{if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip))fail(403,'LOCAL_SETUP_ONLY','Initial setup must be performed on the server');const license=await licenseProvider();if(license.status!=='ACTIVE'||license.activated!==true||license.product!=='retail')fail(403,'ACTIVATION_REQUIRED','Activate Retail first',{activationStatus:license.status});};
 app.get('/api/setup/status',async(req,res)=>{await guard(req);const state=await setupState(pool);res.json({...state,...(state.required?{setupToken:token}:{})});});
 app.post('/api/setup/admin',async(req,res)=>{
 await guard(req);if(req.headers.origin!==config.origin)fail(403,'ORIGIN_DENIED','Setup requires the local application origin');
 if(Date.now()-since>60000){attempts=0;since=Date.now();}if(++attempts>10)fail(429,'SETUP_THROTTLED','Wait before retrying');
 if(!token||req.headers['x-retail-setup-token']!==token)fail(403,'SETUP_TOKEN_REQUIRED','Reload initial setup');
 if(!(await setupState(pool)).required)fail(409,'ALREADY_INITIALIZED','Initial setup is closed');
 try{await bootstrap(pool,{...req.body,username:'admin'},{localFirstAdmin:true});}catch(error){if(error.message==='Bootstrap is only allowed on an empty Retail database')fail(409,'ALREADY_INITIALIZED','Initial setup is closed');throw error;}
 token=null;res.status(201).json({created:true,username:'admin'});
 });
}
