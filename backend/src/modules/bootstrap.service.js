import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { hashPassword } from './auth.service.js';
import { DEFAULT_ROLES, PERMISSIONS } from './registry.js';
import { audit } from './common.js';
export const passwordSchema = z.string().min(12).max(200);
export const usernameSchema = z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.@-]+$/);

export async function bootstrap(pool, input) {
  const values = z.object({company:z.string().trim().min(1).max(200),username:usernameSchema,password:passwordSchema,currency:z.string().regex(/^[A-Z]{3}$/).default('SAR')}).parse(input);
  const passwordHash = await hashPassword(values.password);
  return transaction(pool, async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('retail:bootstrap'))");
    if ((await db.query('SELECT 1 FROM companies LIMIT 1')).rowCount) throw new Error('Bootstrap is only allowed on an empty Retail database');
    const companyId=randomUUID(), branchId=randomUUID(), warehouseId=randomUUID(), userId=randomUUID();
    await db.query('INSERT INTO currencies(code) VALUES($1) ON CONFLICT DO NOTHING',[values.currency]);
    await db.query('INSERT INTO companies(id,name,base_currency) VALUES($1,$2,$3)',[companyId,values.company,values.currency]);
    await db.query('INSERT INTO company_currencies(company_id,code,rate) VALUES($1,$2,1)',[companyId,values.currency]);
    await db.query("INSERT INTO branches(id,company_id,name) VALUES($1,$2,'Main')",[branchId,companyId]);
    await db.query("INSERT INTO warehouses(id,company_id,branch_id,name) VALUES($1,$2,$3,'Main')",[warehouseId,companyId,branchId]);
    await db.query('INSERT INTO users(id,company_id,username,name,password_hash) VALUES($1,$2,$3,$3,$4)',[userId,companyId,values.username,passwordHash]);
    for (const permission of PERMISSIONS) await db.query('INSERT INTO permissions(id) VALUES($1) ON CONFLICT DO NOTHING',[permission]);
    const roleIds={};
    for (const [name,permissions] of Object.entries(DEFAULT_ROLES)) {
      const id=randomUUID(); roleIds[name]=id;
      await db.query('INSERT INTO roles(id,company_id,name,is_admin) VALUES($1,$2,$3,$4)',[id,companyId,name,name==='Admin']);
      for (const permission of permissions) await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)',[id,permission]);
    }
    await db.query('INSERT INTO user_roles VALUES($1,$2,$3)',[companyId,userId,roleIds.Admin]);
    await db.query('INSERT INTO user_branches VALUES($1,$2,$3)',[companyId,userId,branchId]);
    await db.query('INSERT INTO user_warehouses VALUES($1,$2,$3)',[companyId,userId,warehouseId]);
    await audit(db,{companyId,id:userId},'system.bootstrap',companyId);
    return {companyId,branchId,warehouseId,userId,roleIds};
  });
}
