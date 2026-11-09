import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { requireWarehouse } from './auth.service.js';
import { audit,idempotent } from './common.js';

export const movementSchema=z.object({productId:z.union([z.string().min(1).max(100),z.number().int().safe()]),variantId:z.string().max(100).default(''),warehouseId:z.string().uuid(),unitId:z.string().min(1).max(100),quantity:z.number().finite().refine(value=>value!==0).refine(value=>Math.abs(value)<=1e12),kind:z.enum(['opening','receipt','issue','adjustment','return']),reference:z.string().trim().min(1).max(200),lineKey:z.string().min(1).max(100).default('1'),unitCost:z.number().finite().min(0).max(1e12).optional()}).strict();
export async function insertMovement(db,user,input,{unitFactorOverride,unitCostOverride}={}) {
  const data=movementSchema.parse(input);
  await requireWarehouse(db,user,data.warehouseId);
  await db.query('SELECT id FROM products WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,String(data.productId)]);
  const unit=(await db.query('SELECT factor FROM product_units WHERE company_id=$1 AND product_id=$2 AND id=$3',[user.companyId,String(data.productId),data.unitId])).rows[0];
  if(!unit) fail(400,'UNIT_NOT_FOUND','Product unit not found');
  if(data.quantity>0 && data.unitCost===undefined) fail(400,'COST_REQUIRED','Incoming movement needs a cost per original unit');
  const result=(await db.query(`INSERT INTO stock_ledger(id,company_id,product_id,variant_id,warehouse_id,quantity,original_quantity,unit_id,unit_factor,kind,reference,line_key,unit_cost,balance_after,average_cost_after,created_by)
    VALUES($1,$2,$3,$4,$5,$6::numeric*$8::numeric,$6,$7,$8,$9,$10,$11,$12::numeric/$8::numeric,0,0,$13) RETURNING *`,[randomUUID(),user.companyId,String(data.productId),data.variantId,data.warehouseId,data.quantity,data.unitId,unitFactorOverride??unit.factor,data.kind,data.reference,data.lineKey,unitCostOverride??data.unitCost??0,user.id])).rows[0];
  await audit(db,user,'stock.post',result.id,{reference:data.reference,warehouseId:data.warehouseId});
  return result;
}
export async function postMovement(pool,user,key,input) {
  const body=movementSchema.parse(input);
  return transaction(pool,async db=>{
    await requireWarehouse(db,user,body.warehouseId);
    return idempotent(db,user,key,'stock.post',body,()=>insertMovement(db,user,body));
  });
}
