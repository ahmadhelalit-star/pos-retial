import { Router } from 'express';
import express from 'express';
import {MAX_PACKAGE} from './developer-backup.js';
import { z } from 'zod';
import { authenticate,requirePermission,verifyPassword } from '../modules/auth.service.js';
import { fail } from '../http/errors.js';
import { audit } from '../modules/common.js';
import { restoreBackup } from './restore.js';
export function operationRoutes({pool,operations}){
  const router=Router();router.use(authenticate(pool),requirePermission('organization.manage'));
  router.use((req,_res,next)=>{if(!req.user.roles.some(role=>role.is_admin))fail(403,'INSTALLATION_ADMIN_REQUIRED','Installation administrator required');if(operations&&req.user.companyId!==operations.companyId)fail(403,'INSTALLATION_SCOPE_DENIED','Installation owner company required');next();});
  router.get('/status',async(_req,res)=>res.json(operations?{configured:true,backups:await operations.backups.status(),maintenance:operations.maintenance.active,restoreMode:operations.restoreMode??'staged-database',restoreConfigured:operations.restoreConfigured??Boolean(operations.maintenanceConnection&&operations.switchDatabase),packageConfigured:Boolean(operations.backups.packageInfo),lastRestore:await operations.lastRestore?.()??null}:{configured:false}));
  router.use((_req,_res,next)=>{if(!operations)fail(503,'OPERATIONS_NOT_CONFIGURED','Server operations are not configured');next();});
  router.get('/backups',async(_req,res)=>res.json({items:await operations.backups.list()}));
  router.get('/backups/:name/download',async(req,res)=>{if(!operations.backups.packageInfo)fail(409,'BACKUP_DOWNLOAD_UNAVAILABLE','تنزيل الحزمة غير مهيأ.');const info=await operations.backups.packageInfo(req.params.name);res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition',`attachment; filename="${info.downloadName}"`);res.write(info.header);operations.backups.stream(req.params.name,res);});
  router.post('/backups/import',express.raw({type:'application/octet-stream',limit:MAX_PACKAGE}),async(req,res)=>{if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');if(!operations.backups.importPackage)fail(409,'BACKUP_IMPORT_UNAVAILABLE','استيراد الحزمة غير مهيأ.');const result=await operations.backups.importPackage(req.body);await audit(pool,req.user,'backup.import',result.name);res.json(result);});
  router.post('/backups/directory/check',async(req,res)=>{if(!operations.backups.validateDirectory)fail(409,'BACKUP_CHECK_UNAVAILABLE','فحص المسار غير مهيأ.');const {directory}=z.object({directory:z.string().min(3).max(1000)}).strict().parse(req.body);res.json(await operations.backups.validateDirectory(directory));});
  router.put('/backups/automatic',async(req,res)=>{if(!operations.backups.configureAutomatic)fail(409,'BACKUP_SCHEDULE_UNAVAILABLE','الجدولة غير مهيأة.');const {enabled}=z.object({enabled:z.boolean()}).strict().parse(req.body);if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');const status=await operations.backups.configureAutomatic(enabled);await audit(pool,req.user,'backup.automatic','schedule',{enabled});res.json(status);});
  router.post('/backups',async(req,res)=>{if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');const backup=await operations.backups.create();await audit(pool,req.user,'backup.create',backup.name);res.status(201).json({name:backup.name,createdAt:backup.createdAt});});
  router.put('/backups/directory',async(req,res)=>{if(operations.maintenance.active)fail(409,'MAINTENANCE','Maintenance in progress');const {directory,expectedDirectory,copyExisting}=z.object({directory:z.string().min(3).max(1000),expectedDirectory:z.string().max(1000).optional(),copyExisting:z.boolean().optional()}).strict().parse(req.body);const status=await operations.backups.configure(directory,{expectedDirectory,copyExisting});await audit(pool,req.user,'backup.configure','directory',{directory});res.json(status);});
  router.post('/restore',async(req,res)=>{
    const body=z.object({name:z.string().max(200),password:z.string().min(1).max(200),confirmation:z.enum(['RESTORE RETAIL','استعادة البيانات'])}).strict().parse(req.body),hash=(await pool.query('SELECT password_hash FROM users WHERE company_id=$1 AND id=$2',[req.user.companyId,req.user.id])).rows[0]?.password_hash;
    if(!await verifyPassword(body.password,hash))fail(403,'REAUTHENTICATION_FAILED','Administrator password required');await audit(pool,req.user,'restore.request',body.name);
    const result=operations.restore?await operations.restore(body.name,req.user.id):await restoreBackup(operations,body.name,req.user.id);let restarting=false;const restart=()=>{if(restarting)return;restarting=true;operations.requestRestart?.();};res.once('finish',restart);res.once('close',restart);if(res.destroyed){restart();return;}res.json(result);const fallback=setTimeout(restart,1000);fallback.unref();
  });return router;
}
