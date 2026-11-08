import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { createProductLine,tracksInventory } from '../../../shared/catalog.js';
import { requireWarehouse } from './auth.service.js';
import { getProduct } from './products.repository.js';
import { insertMovement } from './stock.service.js';
import { audit,idempotent } from './common.js';
import { D,round,positive,nonnegative,currency,companyCurrency,nextNumber,allocateLineAmounts } from './money.js';
import { lockPartner,balance,requireShift,recordPayment } from './accounts.service.js';

const percent=z.number().finite().min(0).max(100).default(0);
export const cartSchema=z.object({warehouseId:z.string().uuid(),partnerId:z.string().min(1).max(100).optional(),currency:z.string().regex(/^[A-Z]{3}$/),discountPercent:percent,items:z.array(z.object({productId:z.union([z.string().min(1).max(100),z.number().int().safe()]),variantId:z.string().max(100).optional(),unitId:z.string().min(1).max(100).default('base'),quantity:positive,unitPrice:nonnegative.optional(),discountPercent:percent}).strict()).min(1).max(200)}).strict();
const paymentLine=z.object({method:z.enum(['cash','card','transfer']),currency:z.string().regex(/^[A-Z]{3}$/),amount:positive}).strict();
export const documentSchema=cartSchema.extend({shiftId:z.string().uuid().optional(),deviceId:z.string().min(8).max(100).optional(),payments:z.array(paymentLine).max(20).default([])}).strict();

export async function calculateCart(db,user,input,kind='sale',{locked=false}={}){
  const body=cartSchema.parse(input);await requireWarehouse(db,user,body.warehouseId);
  const config=await currency(db,user.companyId,body.currency),base=await companyCurrency(db,user.companyId);
  if(kind==='sale'&&(body.discountPercent>0||body.items.some(item=>item.discountPercent>0))&&!user.permissions.includes('sales.discount'))fail(403,'DISCOUNT_DENIED','Discount permission required');
  if(locked)await db.query('SELECT id FROM products WHERE company_id=$1 AND id=ANY($2::text[]) ORDER BY id FOR UPDATE',[user.companyId,body.items.map(item=>String(item.productId))]);
  const lines=[];let subtotal=D(0),discount=D(0),tax=D(0),total=D(0);
  for(const [index,item] of body.items.entries()){
    const product=await getProduct(db,user.companyId,item.productId,body.warehouseId);let line;
    try{line=createProductLine(product,{unitId:item.unitId,variantId:item.variantId||undefined,qty:Number(item.quantity),operation:kind==='purchase'?'purchase':'sell'});}catch(error){fail(400,'INVALID_LINE',error.message);}
    const priceCurrency=await currency(db,user.companyId,product.currency??base.code);
    let unitPrice=kind==='purchase'?D(product.costPrice??0).mul(line.unitFactor).div(config.rate):D(line.price).mul(priceCurrency.rate).div(config.rate);
    if(item.unitPrice!==undefined){if(kind==='sale'&&!user.permissions.includes('sales.price'))fail(403,'PRICE_OVERRIDE_DENIED','Price override permission required');unitPrice=D(item.unitPrice);}
    const taxConfig=product.taxId?(await db.query('SELECT * FROM tax_configurations WHERE company_id=$1 AND id=$2',[user.companyId,product.taxId])).rows[0]:null;
    const taxRate=D(taxConfig?.rate??0),inclusive=product.priceIncludesTax??taxConfig?.price_includes_tax??false;
    const raw=unitPrice.mul(item.quantity),factor=inclusive?D(1).plus(taxRate.div(100)):D(1);
    const before=D(round(raw.div(factor),config.decimals));
    const net=D(round(raw.mul(D(1).minus(D(item.discountPercent).div(100))).mul(D(1).minus(D(body.discountPercent).div(100))).div(factor),config.decimals));
    const lineTax=D(round(net.mul(taxRate).div(100),config.decimals)),lineTotal=net.plus(lineTax);
    const snapshot={id:String(index+1),productId:product.id,variantId:line.variantId??'',unitId:line.unitId,name:line.name,barcode:line.barcode,sku:product.variants.find(variant=>variant.id===line.variantId)?.sku??product.sku,unit:line.unit,type:product.type,allowFractional:product.allowFractional,quantity:item.quantity,baseQuantity:D(item.quantity).mul(line.unitFactor).toString(),unitFactor:String(line.unitFactor),unitPrice:round(unitPrice,9),price:round(unitPrice,9),discountPercent:item.discountPercent,invoiceDiscountPercent:body.discountPercent,taxRate:taxRate.toString(),priceIncludesTax:inclusive,subtotal:before.toString(),discount:before.minus(net).toString(),net:net.toString(),tax:lineTax.toString(),total:lineTotal.toString(),currency:config.code,exchangeRate:String(config.rate),costBase:'0'};
    lines.push(snapshot);subtotal=subtotal.plus(before);discount=discount.plus(snapshot.discount);tax=tax.plus(lineTax);total=total.plus(lineTotal);
  }
  return {kind,warehouseId:body.warehouseId,partnerId:body.partnerId??null,currency:config.code,exchangeRate:String(config.rate),baseCurrency:base.code,decimals:config.decimals,baseDecimals:base.decimals,subtotal:round(subtotal,config.decimals),discount:round(discount,config.decimals),tax:round(tax,config.decimals),total:round(total,config.decimals),totalBase:round(total.mul(config.rate),base.decimals),netBase:round(subtotal.minus(discount).mul(config.rate),base.decimals),items:lines};
}
export async function persistDocument(db,user,snapshot,{shiftId,originalId,orderId,returnLines}={}){
  const id=randomUUID(),number=await nextNumber(db,user.companyId,snapshot.kind);
  const result={...snapshot,id,number,invoiceNumber:number,shiftId:shiftId??null,createdAt:new Date().toISOString(),cashier:user.name};
  const costBase=snapshot.items.reduce((sum,line)=>sum.plus(line.costBase),D(0));result.costBase=round(costBase,9);
  await db.query('INSERT INTO commercial_documents(company_id,id,number,kind,warehouse_id,partner_id,shift_id,original_id,order_id,currency,exchange_rate,subtotal,discount,tax,total,total_base,cost_base,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)',[user.companyId,id,number,snapshot.kind,snapshot.warehouseId,snapshot.partnerId,shiftId??null,originalId??null,orderId??null,snapshot.currency,snapshot.exchangeRate,snapshot.subtotal,snapshot.discount,snapshot.tax,snapshot.total,snapshot.totalBase,result.costBase,result,user.id]);
  for(const line of snapshot.items)await db.query('INSERT INTO commercial_lines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[user.companyId,id,line.id,String(line.productId),line.variantId,line.unitId,line.quantity,returnLines?.[line.id]??null,line]);
  if(snapshot.partnerId){const sign=snapshot.kind.endsWith('_return')?-1:1;await db.query('INSERT INTO partner_entries(id,company_id,partner_id,document_id,payment_id,amount_base,currency,amount,created_at) VALUES($1,$2,$3,$4,NULL,$5,$6,$7,now())',[randomUUID(),user.companyId,snapshot.partnerId,id,D(snapshot.totalBase).mul(sign).toString(),snapshot.currency,D(snapshot.total).mul(sign).toString()]);}
  await audit(db,user,'document.post',id,{number,kind:snapshot.kind});return result;
}
async function applyDocumentPayments(db,user,result,body,{refund=false,refundBudget}={}){
  const expectedDirection=(result.kind.startsWith('sale')?!refund:refund)?'in':'out';
  const settlementCurrency=await currency(db,user.companyId,result.currency);
  let paid=D(0),paidDocument=D(0);for(const entry of body.payments){const config=await currency(db,user.companyId,entry.currency);paid=paid.plus(D(round(D(entry.amount).mul(config.rate),result.baseDecimals)));paidDocument=paidDocument.plus(D(round(D(entry.amount).mul(config.rate).div(settlementCurrency.rate),result.decimals)));}
  if(refund){if(paidDocument.gt(result.total)||(refundBudget!==undefined&&paidDocument.gt(refundBudget)))fail(409,'EXCESS_REFUND','Refund exceeds returned or previously paid amount');}
  else if(paid.gt(D(result.totalBase).plus(D(10).pow(-result.baseDecimals).div(2))))fail(400,'OVERPAYMENT','Allocate excess cash as a separate partner advance');
  if(!result.partnerId&&!(refund?paidDocument.eq(result.total):paid.eq(result.totalBase)))fail(400,'CUSTOMER_REQUIRED','Credit or partial payment requires a customer');
  const payments=[];
  for(const entry of body.payments){
    const entryConfig=await currency(db,user.companyId,entry.currency);
    const documentAmount=round(D(entry.amount).mul(entryConfig.rate).div(result.exchangeRate),result.decimals);
    const refundAmount=refund?round(D(entry.amount).mul(entryConfig.rate).div(settlementCurrency.rate),result.decimals):undefined;
    const payment=await recordPayment(db,user,{...entry,partnerId:result.partnerId??undefined,shiftId:body.shiftId,deviceId:body.deviceId,direction:expectedDirection,allocations:!refund&&result.partnerId?[{documentId:result.id,amount:documentAmount}]:[]},{documentId:result.id,alreadyLocked:true,...(refund?{refundDocumentAmount:refundAmount,linkedRefundCarryingBase:round(D(refundAmount).mul(result.exchangeRate),result.baseDecimals)}:{})});payments.push(payment);
  }
  return payments;
}
export async function postDocument(pool,user,key,input,kind='sale'){
  const body=documentSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,`document.${kind}`,body,async()=>{
    if(kind==='sale'||body.payments.length){if(!body.shiftId||!body.deviceId)fail(400,'SHIFT_REQUIRED','An open cashier shift is required');await requireShift(db,user,body.shiftId,body.deviceId,{warehouseId:body.warehouseId});}
    const partner=await lockPartner(db,user,body.partnerId,kind==='sale'?'customer':'supplier');if(kind==='purchase'&&!partner)fail(400,'SUPPLIER_REQUIRED','Supplier is required');
    const snapshot=await calculateCart(db,user,bodyToCart(body),kind,{locked:true});
    const pendingId=randomUUID();
    for(const line of snapshot.items){
      if(tracksInventory(line)){
        const movement=await insertMovement(db,user,{productId:line.productId,variantId:line.variantId,warehouseId:body.warehouseId,unitId:line.unitId,quantity:Number(line.quantity)*(kind==='sale'?-1:1),kind:kind==='sale'?'issue':'receipt',unitCost:kind==='purchase'?Number(D(line.net).mul(snapshot.exchangeRate).div(line.quantity)):0,reference:`post:${pendingId}`,lineKey:line.id});
        line.stockMovementId=movement.id;line.costBase=D(movement.unit_cost).mul(line.baseQuantity).toString();
      }
    }
    const result=await persistDocument(db,user,snapshot,{shiftId:body.shiftId});
    const payments=await applyDocumentPayments(db,user,result,body);
    if(partner?.kind==='customer'&&D(partner.credit_limit).gt(0)&&D(await balance(db,user.companyId,partner.id)).gt(partner.credit_limit))fail(409,'CREDIT_LIMIT_EXCEEDED','Customer credit limit exceeded');
    return {...result,payments,outstandingBase:partner?await balance(db,user.companyId,partner.id):'0'};
  }));
}
export const bodyToCart=({warehouseId,partnerId,currency,discountPercent,items})=>({warehouseId,partnerId,currency,discountPercent,items});
export const returnSchema=z.object({shiftId:z.string().uuid().optional(),deviceId:z.string().min(8).max(100).optional(),reason:z.string().trim().min(2).max(500),items:z.array(z.object({lineId:z.string().min(1).max(100),quantity:positive,restock:z.boolean().default(true)}).strict()).min(1).max(200),payments:z.array(paymentLine).max(20).default([])}).strict();
export async function reverseDocument(pool,user,key,id,input,{cancel=false}={}){
  const body=returnSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,`document.${cancel?'cancel':'return'}:${id}`,body,async()=>{
    const source=(await db.query('SELECT * FROM commercial_documents WHERE company_id=$1 AND id=$2',[user.companyId,id])).rows[0];if(!source||!['sale','purchase'].includes(source.kind))fail(404,'NOT_FOUND','Original invoice not found');await requireWarehouse(db,user,source.warehouse_id);
    if(body.payments.length||source.kind==='sale'){if(!body.shiftId||!body.deviceId)fail(400,'SHIFT_REQUIRED','Refund needs an open shift');await requireShift(db,user,body.shiftId,body.deviceId,{warehouseId:source.warehouse_id});}
    await lockPartner(db,user,source.partner_id);
    await db.query('SELECT id FROM commercial_documents WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id]);
    if((await db.query('SELECT 1 FROM document_cancellations WHERE company_id=$1 AND document_id=$2',[user.companyId,id])).rowCount)fail(409,'ALREADY_CANCELLED','Invoice already cancelled');
    if(new Set(body.items.map(row=>row.lineId)).size!==body.items.length)fail(400,'DUPLICATE_LINE','Return line repeated');
    const prior=(await db.query('SELECT l.original_line_id,sum(l.quantity) quantity FROM commercial_lines l JOIN commercial_documents d ON d.company_id=l.company_id AND d.id=l.document_id WHERE d.company_id=$1 AND d.original_id=$2 GROUP BY l.original_line_id',[user.companyId,id])).rows;
    if(cancel&&(prior.length||body.items.length!==source.snapshot.items.length))fail(409,'CANNOT_CANCEL_PARTIAL','Cancellation must reverse a complete unreturned invoice');
    const snapshot={...source.snapshot,kind:`${source.kind}_return`,items:[],subtotal:'0',discount:'0',tax:'0',total:'0',totalBase:'0',netBase:'0',reason:body.reason,originalId:id};delete snapshot.id;delete snapshot.number;
    const returnLines={};await db.query('SELECT id FROM products WHERE company_id=$1 AND id=ANY($2::text[]) ORDER BY id FOR UPDATE',[user.companyId,source.snapshot.items.map(line=>String(line.productId))]);
    for(const [index,entry] of body.items.entries()){
      const original=source.snapshot.items.find(line=>line.id===entry.lineId),already=D(prior.find(row=>row.original_line_id===entry.lineId)?.quantity??0);
      if(!original||D(entry.quantity).plus(already).gt(original.quantity)||(cancel&&!D(entry.quantity).eq(original.quantity)))fail(409,'EXCESS_RETURN','Return exceeds the unreturned quantity');
      if(!original.allowFractional&&!D(entry.quantity).isInteger())fail(400,'FRACTION_NOT_ALLOWED','Fractional return not allowed');
      const line={...original,id:String(index+1),quantity:entry.quantity,baseQuantity:D(entry.quantity).mul(original.unitFactor).toString(),restock:entry.restock};returnLines[line.id]=original.id;
      Object.assign(line,allocateLineAmounts(original,already,entry.quantity,snapshot.decimals));
      line.costBase=round(D(original.costBase).mul(entry.quantity).div(original.quantity),9);
      if(tracksInventory(line)&&(source.kind==='purchase'||entry.restock)){
        const movement=await insertMovement(db,user,{productId:line.productId,variantId:line.variantId,warehouseId:source.warehouse_id,unitId:line.unitId,quantity:Number(line.quantity)*(source.kind==='sale'?1:-1),kind:source.kind==='sale'?'return':'issue',unitCost:Number(D(original.costBase).div(original.quantity)),reference:`return:${randomUUID()}`,lineKey:line.id},{unitFactorOverride:original.unitFactor});
        line.stockMovementId=movement.id;if(source.kind==='purchase'){line.valuationVarianceBase=D(line.net).mul(snapshot.exchangeRate).minus(D(movement.unit_cost).mul(line.baseQuantity)).toString();line.costBase=D(movement.unit_cost).mul(line.baseQuantity).toString();}
      }else if(!entry.restock&&source.kind==='sale')line.costBase='0';
      snapshot.items.push(line);
    }
    for(const field of ['subtotal','discount','tax','total'])snapshot[field]=round(snapshot.items.reduce((sum,line)=>sum.plus(line[field]),D(0)),snapshot.decimals);
    snapshot.totalBase=round(D(snapshot.total).mul(snapshot.exchangeRate),snapshot.baseDecimals);snapshot.netBase=round(D(snapshot.subtotal).minus(snapshot.discount).mul(snapshot.exchangeRate),snapshot.baseDecimals);
    const paid=(await db.query('SELECT COALESCE(sum(amount),0) amount FROM payment_allocations WHERE company_id=$1 AND document_id=$2',[user.companyId,id])).rows[0].amount;
    const walkInPaid=!source.partner_id?(await db.query('SELECT COALESCE(sum(amount_base),0) amount FROM payments WHERE company_id=$1 AND document_id=$2',[user.companyId,id])).rows[0].amount:'0';
    const refunded=(await db.query("SELECT COALESCE(sum((p.snapshot->>'refundDocumentAmount')::numeric),0) amount FROM payments p JOIN commercial_documents d ON d.company_id=p.company_id AND d.id=p.document_id WHERE d.company_id=$1 AND d.original_id=$2",[user.companyId,id])).rows[0].amount;
    const refundBudget=D(paid).plus(D(walkInPaid).div(source.exchange_rate)).minus(refunded);
    const result=await persistDocument(db,user,snapshot,{shiftId:body.shiftId,originalId:id,returnLines});const payments=await applyDocumentPayments(db,user,result,body,{refund:true,refundBudget});
    if(cancel)await db.query('INSERT INTO document_cancellations(company_id,document_id,reversal_id,reason,created_by) VALUES($1,$2,$3,$4,$5)',[user.companyId,id,result.id,body.reason,user.id]);
    return {...result,payments,cancelled:cancel};
  }));
}
