import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { PERMISSIONS } from './registry.js';
import { hashPassword } from './auth.service.js';
import { passwordSchema,usernameSchema } from './bootstrap.service.js';
import { audit } from './common.js';

const roleSchema = z.object({name:z.string().trim().min(1).max(100),permissions:z.array(z.enum(PERMISSIONS)).max(100)}).strict();
const userSchema = z.object({username:usernameSchema.optional(),phone:z.string().max(50).optional(),name:z.string().trim().min(1).max(200),password:passwordSchema.optional(),active:z.boolean().default(true),roleIds:z.array(z.string().uuid()).min(1).max(20),branches:z.array(z.string().uuid()).min(1).max(100),warehouses:z.array(z.string().uuid()).min(1).max(100)}).strict();
async function lockCompany(db,user) { await db.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[user.companyId]); }
async function protectAdmin(db,companyId) {
  const result=await db.query('SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.company_id=$1 AND u.active AND r.is_admin LIMIT 1',[companyId]);
  if (!result.rowCount) fail(409,'LAST_ADMIN_PROTECTED','At least one active Admin must remain');
}
export async function saveRole(pool,user,id,input) {
  const data=roleSchema.parse(input);
  if (data.permissions.some((permission)=>!user.permissions.includes(permission))) fail(403,'GRANT_DENIED','Cannot grant permissions you do not hold');
  return transaction(pool,async db=>{
    await lockCompany(db,user);
    if (id) {
      const role=(await db.query('SELECT * FROM roles WHERE company_id=$1 AND id=$2',[user.companyId,id])).rows[0];
      if (!role) fail(404,'NOT_FOUND','Role not found');
      if (role.is_admin) fail(409,'ADMIN_ROLE_PROTECTED','Built-in Admin permissions cannot be changed');
      await db.query('UPDATE roles SET name=$3 WHERE company_id=$1 AND id=$2',[user.companyId,id,data.name]);
      await db.query('DELETE FROM role_permissions WHERE role_id=$1',[id]);
    } else { id=randomUUID(); await db.query('INSERT INTO roles(id,company_id,name) VALUES($1,$2,$3)',[id,user.companyId,data.name]); }
    for (const permission of new Set(data.permissions)) await db.query('INSERT INTO role_permissions VALUES($1,$2)',[id,permission]);
    await db.query('DELETE FROM sessions WHERE user_id IN(SELECT user_id FROM user_roles WHERE role_id=$1)',[id]);
    await protectAdmin(db,user.companyId); await audit(db,user,'role.save',id,{permissions:data.permissions});
    return {id,...data};
  });
}
export async function saveUser(pool,user,id,input) {
  const data=userSchema.parse(input);
  if (!id && !data.password) fail(400,'PASSWORD_REQUIRED','Password required');
  if (data.branches.some(value=>!user.branches.includes(value)) || data.warehouses.some(value=>!user.warehouses.includes(value))) fail(403,'SCOPE_GRANT_DENIED','Cannot grant a wider branch/warehouse scope');
  let loginName=data.username??(id?null:'local_'+randomUUID());
  const passwordHash=data.password?await hashPassword(data.password):null;
  return transaction(pool,async db=>{
    await lockCompany(db,user);
    for (const roleId of new Set(data.roleIds)) {
      const role=(await db.query('SELECT * FROM roles WHERE company_id=$1 AND id=$2',[user.companyId,roleId])).rows[0];
      if (!role) fail(400,'INVALID_ROLE','Role outside company');
      const permissions=(await db.query('SELECT permission_id FROM role_permissions WHERE role_id=$1',[roleId])).rows.map(row=>row.permission_id);
      if (permissions.some(permission=>!user.permissions.includes(permission))) fail(403,'GRANT_DENIED','Cannot assign a role with greater permissions');
      if (role.is_admin && !user.roles.some(entry=>entry.is_admin)) fail(403,'ADMIN_GRANT_DENIED','Only Admin can assign Admin');
    }
    for (const warehouseId of data.warehouses) {
      const warehouse=(await db.query('SELECT branch_id FROM warehouses WHERE company_id=$1 AND id=$2',[user.companyId,warehouseId])).rows[0];
      if (!warehouse || !data.branches.includes(warehouse.branch_id)) fail(400,'INVALID_SCOPE','Warehouse must belong to an assigned branch');
    }
    if (id) {
      const result=await db.query('UPDATE users SET username=COALESCE($3,username),name=$4,active=$5,password_hash=COALESCE($6,password_hash),phone=COALESCE($7,phone) WHERE company_id=$1 AND id=$2 RETURNING username',[user.companyId,id,loginName,data.name,data.active,passwordHash,data.phone??null]);
      if (!result.rowCount) fail(404,'NOT_FOUND','User not found');
      loginName=result.rows[0].username;
      for (const table of ['user_roles','user_branches','user_warehouses']) await db.query(`DELETE FROM ${table} WHERE user_id=$1`,[id]);
      await db.query('DELETE FROM sessions WHERE user_id=$1',[id]);
    } else { id=randomUUID(); await db.query('INSERT INTO users(id,company_id,username,name,password_hash,active,phone) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,user.companyId,loginName,data.name,passwordHash,data.active,data.phone??'']); }
    for (const roleId of new Set(data.roleIds)) await db.query('INSERT INTO user_roles VALUES($1,$2,$3)',[user.companyId,id,roleId]);
    for (const branchId of new Set(data.branches)) await db.query('INSERT INTO user_branches VALUES($1,$2,$3)',[user.companyId,id,branchId]);
    for (const warehouseId of new Set(data.warehouses)) await db.query('INSERT INTO user_warehouses VALUES($1,$2,$3)',[user.companyId,id,warehouseId]);
    await protectAdmin(db,user.companyId); await audit(db,user,'user.save',id,{active:data.active,roleIds:data.roleIds});
    return {id,username:loginName,name:data.name,active:data.active};
  });
}
