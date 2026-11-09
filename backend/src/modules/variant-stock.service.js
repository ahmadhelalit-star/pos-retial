import {randomUUID} from 'node:crypto';
import Decimal from 'decimal.js';
import {z} from 'zod';
import {fail} from '../http/errors.js';
import {requireWarehouse} from './auth.service.js';
import {insertMovement} from './stock.service.js';
import {audit} from './common.js';

const quantity=z.number().finite().nonnegative().max(1e12).refine(value=>new Decimal(value).decimalPlaces()<=9);
export const distributionSchema=z.array(z.object({warehouseId:z.string().uuid(),expectedQuantity:z.string().max(40).regex(/^\d+(\.\d{1,9})?$/),items:z.array(z.object({variantId:z.string().min(1).max(100),quantity}).strict()).max(2000)}).strict()).max(100);
export async function variantBalances(db,user,id){
 if(!user.permissions.includes('stock.post'))fail(403,'PERMISSION_DENIED','صلاحية تعديل المخزون مطلوبة / stock.post required');
 const product=(await db.query('SELECT data,version FROM products WHERE company_id=$1 AND id=$2 AND archived_at IS NULL',[user.companyId,String(id)])).rows[0];
 if(!product)fail(404,'NOT_FOUND','Product not found');
 if(product.data.type!=='stock'||product.data.variants?.length)fail(409,'VARIANT_CONVERSION_UNAVAILABLE','المنتج ليس منتجًا مخزنيًا بسيطًا / A simple stocked product is required');
 const rows=(await db.query("SELECT b.warehouse_id,w.name,b.quantity,b.average_cost FROM stock_balances b JOIN warehouses w ON w.company_id=b.company_id AND w.id=b.warehouse_id WHERE b.company_id=$1 AND b.product_id=$2 AND b.variant_id='' AND b.quantity<>0 ORDER BY b.warehouse_id",[user.companyId,String(id)])).rows;
 for(const row of rows){await requireWarehouse(db,user,row.warehouse_id);if(new Decimal(row.quantity).isNegative())fail(409,'NEGATIVE_STOCK','يجب تسوية الرصيد السالب قبل توزيع المنتج / Resolve negative stock first');}
 return {version:product.version,items:rows.map(row=>({warehouseId:row.warehouse_id,name:row.name,quantity:row.quantity}))};
}
export async function prepareDistribution(db,user,previous,product,input){
 if(!user.permissions.includes('stock.post'))fail(403,'PERMISSION_DENIED','صلاحية تعديل المخزون مطلوبة / stock.post required');
 const entries=distributionSchema.parse(input);
 if(previous.type!=='stock'||previous.variants.length||product.type!=='stock'||!product.variants.length||product.baseUnitId!==previous.baseUnitId||product.allowFractional!==previous.allowFractional)fail(409,'INVALID_DISTRIBUTION','يمكن تحويل منتج مخزني بسيط فقط دون تغيير وحدته أو سياسة الكسور / Invalid conversion');
 // Unfulfilled orders still need their original simple product; don't break delivery.
 const pending=await db.query(`SELECT 1 FROM commercial_orders o CROSS JOIN LATERAL jsonb_array_elements(o.snapshot->'items') l WHERE o.company_id=$1 AND o.kind='order' AND l->>'productId'=$2 AND (l->>'quantity')::numeric>COALESCE((SELECT sum((dl->>'quantity')::numeric) FROM commercial_deliveries d CROSS JOIN LATERAL jsonb_array_elements(d.snapshot->'items') dl WHERE d.company_id=o.company_id AND d.order_id=o.id AND dl->>'id'=l->>'id'),0) LIMIT 1`,[user.companyId,String(product.id)]);
 if(pending.rowCount)fail(409,'PENDING_DELIVERIES','أكمل تسليم أوامر البيع المفتوحة قبل تحويل المنتج / Complete pending deliveries first');
 const balances=(await db.query("SELECT warehouse_id,quantity,average_cost FROM stock_balances WHERE company_id=$1 AND product_id=$2 AND variant_id='' ORDER BY warehouse_id FOR UPDATE",[user.companyId,String(product.id)])).rows;
 const known=new Set(),variants=new Set(product.variants.map(row=>row.id)),plan=[];
 for(const entry of entries){
  if(known.has(entry.warehouseId))fail(400,'DUPLICATE_WAREHOUSE','Duplicate warehouse');known.add(entry.warehouseId);await requireWarehouse(db,user,entry.warehouseId);
  const balance=balances.find(row=>row.warehouse_id===entry.warehouseId),current=new Decimal(balance?.quantity??0);
  if(current.isNegative())fail(409,'NEGATIVE_STOCK','Resolve negative stock first');
  if(!current.eq(entry.expectedQuantity))fail(409,'STOCK_CHANGED','تغير الرصيد أثناء التعديل. أغلق النافذة وأعد فتحها / Stock changed; reload the product');
  const seen=new Set();let total=new Decimal(0);
  for(const item of entry.items){if(!variants.has(item.variantId)||seen.has(item.variantId))fail(400,'INVALID_VARIANT','Invalid or duplicate variant');seen.add(item.variantId);if(!product.allowFractional&&!Number.isInteger(item.quantity))fail(400,'FRACTIONAL_NOT_ALLOWED','Enable fractional quantities first');total=total.plus(item.quantity);}
  if(!total.eq(current))fail(409,'DISTRIBUTION_TOTAL','مجموع التركيبات يجب أن يساوي الرصيد الحالي لكل مخزن / Variant total must equal each warehouse balance');
  plan.push({...entry,quantity:current.toNumber(),unitCost:Number(balance?.average_cost??0),exactUnitCost:balance?.average_cost??'0'});
 }
 for(const row of balances)if(!known.has(row.warehouse_id)&&!new Decimal(row.quantity).isZero())fail(409,'DISTRIBUTION_INCOMPLETE','يجب توزيع رصيد جميع المخازن / Distribute all warehouses');
 return {entries:plan,reference:`variants:${randomUUID()}`};
}
export async function debitDistribution(db,user,previous,plan){
 for(const entry of plan.entries)if(entry.quantity>0)await insertMovement(db,user,{productId:previous.id,variantId:'',warehouseId:entry.warehouseId,unitId:previous.baseUnitId,quantity:-entry.quantity,kind:'adjustment',reference:plan.reference,lineKey:`out:${entry.warehouseId}`});
}
export async function creditDistribution(db,user,product,plan){
 for(const [warehouseIndex,entry] of plan.entries.entries())for(const [itemIndex,item] of entry.items.entries())if(item.quantity>0)await insertMovement(db,user,{productId:product.id,variantId:item.variantId,warehouseId:entry.warehouseId,unitId:product.baseUnitId,quantity:item.quantity,unitCost:entry.unitCost,kind:'adjustment',reference:plan.reference,lineKey:`in:${warehouseIndex}:${itemIndex}`},{unitCostOverride:entry.exactUnitCost});
 await audit(db,user,'product.variant.distribute',product.id,{reference:plan.reference,warehouses:plan.entries.map(row=>({warehouseId:row.warehouseId,items:row.items}))});
}
