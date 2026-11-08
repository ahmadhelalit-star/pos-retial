import { Router } from 'express';
import { z } from 'zod';
import { authenticate,requirePermission,verifyPassword } from '../modules/auth.service.js';
import { fail } from '../http/errors.js';
import { audit } from '../modules/common.js';
import { restoreBackup } from './restore.js';
export function operationRoutes({pool,operations}){
  const router=Router();router.use(authenticate(pool),requirePermission('organization.manage'));
  router.use((req,_res,next)=>{if(!req.user.roles.some(role=>role.is_admin))fail(403,'INSTALLATION_ADMIN_REQUIRED','Installation administrator required');if(operations&&req.user.companyId!==operations.companyId)fail(403,'INSTALLATION_SCOPE_DENIED','Installation owner company required');next();});
  router.get('/status',async(_req,res)=>res.json(operations?{configured:true,backups:await operations.backups.status(),maintenance:operations.maintenance.active,restoreConfigured:Boolean(operations.maintenanceConnection&&operations.switchDatabase)}:{configured:false}));
  router.use((_req,_res,next)=>{if(!operations)fail(503,'OPERATIONS_NOT_CONFIGURED','Server operations are not configured');next();});
  router.get('/backups',async(_req,res)=>res.json({items:await operations.backups.list()}));
  router.post('/backups',async(req,res)=>{if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');const backup=await operations.backups.create();await audit(pool,req.user,'backup.create',backup.name);res.status(201).json({name:backup.name,createdAt:backup.createdAt});});
  router.put('/backups/directory',async(req,res)=>{if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');const {directory}=z.object({directory:z.string().min(3).max(1000)}).strict().parse(req.body);const status=await operations.backups.configure(directory);await audit(pool,req.user,'backup.configure','directory',{directory});res.json(status);});
  router.post('/restore',async(req,res)=>{
    const body=z.object({name:z.string().max(200),password:z.string().min(1).max(200),confirmation:z.literal('RESTORE RETAIL')}).strict().parse(req.body),hash=(await pool.query('SELECT password_hash FROM users WHERE company_id=$1 AND id=$2',[req.user.companyId,req.user.id])).rows[0]?.password_hash;
    if(!await verifyPassword(body.password,hash))fail(403,'REAUTHENTICATION_FAILED','Administrator password required');await audit(pool,req.user,'restore.request',body.name);
    const result=await restoreBackup(operations,body.name,req.user.id);res.once('finish',()=>operations.requestRestart?.());res.json(result);
  });return router;
}
