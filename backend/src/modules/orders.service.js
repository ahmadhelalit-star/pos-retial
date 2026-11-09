import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { audit,idempotent } from './common.js';
import { D,positive,round,nextNumber,currency,allocateLineAmounts } from './money.js';
import { calculateCart,cartSchema,persistDocument } from './commerce.service.js';
import { lockPartner,requireShift,recordPayment,balance } from './accounts.service.js';
import { requireWarehouse } from './auth.service.js';
import { insertMovement } from './stock.service.js';
import { tracksInventory } from '../../../shared/catalog.js';

export async function getOrder(db,user,id){
  const row=(await db.query('SELECT * FROM commercial_orders WHERE company_id=$1 AND id=$2',[user.companyId,id])).rows[0];if(!row)fail(404,'NOT_FOUND','Order not found');await requireWarehouse(db,user,row.warehouse_id);
  const progress=(await db.query('SELECT a.line_id,sum(a.quantity) delivered,sum(a.invoiced) invoiced FROM delivery_allocations a JOIN commercial_deliveries d ON d.company_id=a.company_id AND d.id=a.delivery_id WHERE d.company_id=$1 AND d.order_id=$2 GROUP BY a.line_id',[user.companyId,id])).rows;
  return {...row,snapshot:{...row.snapshot,items:row.snapshot.items.map(line=>({...line,delivered:progress.find(entry=>entry.line_id===line.id)?.delivered??'0',invoiced:progress.find(entry=>entry.line_id===line.id)?.invoiced??'0'}))}};
}
export async function createOrder(pool,user,key,input,kind='quotation'){
  const body=cartSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,`order.${kind}`,body,async()=>{
    await lockPartner(db,user,body.partnerId,'customer');const snapshot=await calculateCart(db,user,body),id=randomUUID(),number=await nextNumber(db,user.companyId,kind);
    await db.query('INSERT INTO commercial_orders(company_id,id,number,kind,warehouse_id,partner_id,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[user.companyId,id,number,kind,body.warehouseId,body.partnerId??null,snapshot,user.id]);await audit(db,user,`order.${kind}`,id);return getOrder(db,user,id);
  }));
}
export async function convertQuotation(pool,user,key,id){return transaction(pool,db=>idempotent(db,user,key,`quotation.convert:${id}`,{},async()=>{
  const source=await getOrder(db,user,id);if(source.kind!=='quotation')fail(409,'QUOTATION_REQUIRED','Only quotations can convert');
  await db.query('SELECT id FROM products WHERE company_id=$1 AND id=ANY($2::text[]) ORDER BY id FOR UPDATE',[user.companyId,source.snapshot.items.map(line=>String(line.productId))]);
  for(const line of source.snapshot.items){const current=(await db.query('SELECT data FROM products WHERE company_id=$1 AND id=$2',[user.companyId,String(line.productId)])).rows[0];if(current?.data.variants?.length&&!current.data.variants.some(row=>row.id===line.variantId))fail(409,'QUOTATION_REVIEW_REQUIRED','تغيرت تركيبات المنتج؛ أنشئ عرض سعر محدثًا قبل التحويل / Product variants changed; create an updated quotation');}
  const next=randomUUID(),number=await nextNumber(db,user.companyId,'order');await db.query("INSERT INTO commercial_orders(company_id,id,number,kind,warehouse_id,partner_id,source_id,snapshot,created_by) VALUES($1,$2,$3,'order',$4,$5,$6,$7,$8)",[user.companyId,next,number,source.warehouse_id,source.partner_id,id,source.snapshot,user.id]);return getOrder(db,user,next);
}));}
const quantityRequest=z.object({items:z.array(z.object({lineId:z.string().min(1).max(100),quantity:positive}).strict()).min(1).max(200)}).strict();
export async function deliverOrder(pool,user,key,id,input){const body=quantityRequest.parse(input);return transaction(pool,db=>idempotent(db,user,key,`order.deliver:${id}`,body,async()=>{
  await db.query('SELECT id FROM commercial_orders WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id]);const order=await getOrder(db,user,id);if(order.kind!=='order')fail(409,'ORDER_REQUIRED','Sales order required');
  if(new Set(body.items.map(row=>row.lineId)).size!==body.items.length)fail(400,'DUPLICATE_LINE','Repeated line');
  const deliveryId=randomUUID(),number=await nextNumber(db,user.companyId,'delivery'),lines=[];
  await db.query('SELECT id FROM products WHERE company_id=$1 AND id=ANY($2::text[]) ORDER BY id FOR UPDATE',[user.companyId,order.snapshot.items.map(line=>String(line.productId))]);
  for(const request of body.items){const line=order.snapshot.items.find(entry=>entry.id===request.lineId);if(!line||D(request.quantity).plus(line.delivered).gt(line.quantity))fail(409,'EXCESS_DELIVERY','Delivery exceeds ordered quantity');if(!line.allowFractional&&!D(request.quantity).isInteger())fail(400,'FRACTION_NOT_ALLOWED','Whole units required');let cost=D(0);
    if(tracksInventory(line)){const movement=await insertMovement(db,user,{productId:line.productId,variantId:line.variantId,warehouseId:order.warehouse_id,unitId:line.unitId,quantity:-Number(request.quantity),kind:'issue',reference:number,lineKey:line.id,unitCost:0},{unitFactorOverride:line.unitFactor});cost=D(movement.unit_cost).mul(request.quantity).mul(line.unitFactor);}
    lines.push({...line,quantity:request.quantity,costBase:cost.toString()});
  }
  await db.query('INSERT INTO commercial_deliveries(company_id,id,order_id,number,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,deliveryId,id,number,{items:lines},user.id]);
  for(const line of lines)await db.query('INSERT INTO delivery_allocations VALUES($1,$2,$3,$4,0,$5)',[user.companyId,deliveryId,line.id,line.quantity,line.costBase]);
  await audit(db,user,'order.deliver',deliveryId,{orderId:id});return {id:deliveryId,number,order:await getOrder(db,user,id)};
}));}
const invoiceOrderSchema=quantityRequest.extend({shiftId:z.string().uuid(),deviceId:z.string().min(8).max(100),payments:z.array(z.object({method:z.enum(['cash','card','transfer']),currency:z.string().regex(/^[A-Z]{3}$/),amount:positive}).strict()).default([])}).strict();
export async function invoiceOrder(pool,user,key,id,input){const body=invoiceOrderSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,`order.invoice:${id}`,body,async()=>{
  await requireShift(db,user,body.shiftId,body.deviceId);const raw=(await db.query('SELECT partner_id FROM commercial_orders WHERE company_id=$1 AND id=$2',[user.companyId,id])).rows[0];await lockPartner(db,user,raw?.partner_id,'customer');
  await db.query('SELECT id FROM commercial_orders WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id]);const order=await getOrder(db,user,id);if(order.kind!=='order')fail(409,'ORDER_REQUIRED','Sales order required');
  if(new Set(body.items.map(row=>row.lineId)).size!==body.items.length)fail(400,'DUPLICATE_LINE','Repeated line');
  await requireShift(db,user,body.shiftId,body.deviceId,{warehouseId:order.warehouse_id});
  const currentCurrency=await currency(db,user.companyId,order.snapshot.currency);
  const snapshot={...order.snapshot,exchangeRate:currentCurrency.rate,kind:'sale',items:[]};
  for(const [index,request] of body.items.entries()){
    const line=order.snapshot.items.find(entry=>entry.id===request.lineId);if(!line||D(request.quantity).plus(line.invoiced).gt(line.delivered))fail(409,'NOT_DELIVERED','Invoice cannot exceed uninvoiced deliveries');
    if(!line.allowFractional&&!D(request.quantity).isInteger())fail(400,'FRACTION_NOT_ALLOWED','Whole units required');
    let remaining=D(request.quantity),cost=D(0);const deliveries=(await db.query('SELECT a.*,d.created_at FROM delivery_allocations a JOIN commercial_deliveries d ON d.company_id=a.company_id AND d.id=a.delivery_id WHERE a.company_id=$1 AND d.order_id=$2 AND a.line_id=$3 ORDER BY d.created_at,d.id FOR UPDATE OF a',[user.companyId,id,line.id])).rows;
    for(const delivery of deliveries){const available=D(delivery.quantity).minus(delivery.invoiced),use=remaining.lt(available)?remaining:available;if(use.gt(0)){await db.query('UPDATE delivery_allocations SET invoiced=invoiced+$4 WHERE company_id=$1 AND delivery_id=$2 AND line_id=$3',[user.companyId,delivery.delivery_id,line.id,use.toString()]);cost=cost.plus(D(delivery.cost).mul(use).div(delivery.quantity));remaining=remaining.minus(use);}if(remaining.eq(0))break;}
    const next={...line,id:String(index+1),orderLineId:line.id,quantity:request.quantity,baseQuantity:D(request.quantity).mul(line.unitFactor).toString(),costBase:cost.toString()};
    // Allocate the difference of rounded cumulative amounts so all partial invoices total exactly the order.
    Object.assign(next,allocateLineAmounts(line,line.invoiced,request.quantity,snapshot.decimals));snapshot.items.push(next);
  }
  for(const field of ['subtotal','discount','tax','total'])snapshot[field]=round(snapshot.items.reduce((sum,line)=>sum.plus(line[field]),D(0)),snapshot.decimals);snapshot.totalBase=round(D(snapshot.total).mul(snapshot.exchangeRate),snapshot.baseDecimals);snapshot.netBase=round(D(snapshot.subtotal).minus(snapshot.discount).mul(snapshot.exchangeRate),snapshot.baseDecimals);
  const result=await persistDocument(db,user,snapshot,{shiftId:body.shiftId,orderId:id});let paid=D(0);const payments=[];
  for(const payment of body.payments){const current=await currencyRate(db,user,payment.currency);paid=paid.plus(D(payment.amount).mul(current.rate));if(paid.gt(result.totalBase))fail(400,'OVERPAYMENT','Payment exceeds order invoice');payments.push(await recordPayment(db,user,{...payment,shiftId:body.shiftId,deviceId:body.deviceId,partnerId:order.partner_id??undefined,direction:'in',allocations:order.partner_id?[{documentId:result.id,amount:round(D(payment.amount).mul(current.rate).div(result.exchangeRate),result.decimals)}]:[]},{documentId:result.id,alreadyLocked:true}));}
  if(!order.partner_id&&!D(round(paid,result.baseDecimals)).eq(result.totalBase))fail(400,'CUSTOMER_REQUIRED','Unpaid invoice requires a customer');
  if(order.partner_id){const partner=await lockPartner(db,user,order.partner_id);if(D(partner.credit_limit).gt(0)&&D(await balance(db,user.companyId,partner.id)).gt(partner.credit_limit))fail(409,'CREDIT_LIMIT_EXCEEDED','Credit limit exceeded');}
  return {...result,payments};
}));}
async function currencyRate(db,user,code){const row=(await db.query('SELECT rate FROM company_currencies WHERE company_id=$1 AND code=$2 FOR SHARE',[user.companyId,code])).rows[0];if(!row)fail(400,'CURRENCY_NOT_CONFIGURED','Currency unavailable');return row;}
