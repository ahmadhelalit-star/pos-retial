import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { requireWarehouse } from './auth.service.js';
import { audit,idempotent } from './common.js';
import { nonnegative,positive,D,round,currency,companyCurrency,nextNumber } from './money.js';

export async function lockPartner(db,user,id,kind){
  if(!id)return null;
  const partner=(await db.query('SELECT * FROM partners WHERE company_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE',[user.companyId,id])).rows[0];
  if(!partner||(kind&&partner.kind!==kind))fail(400,'INVALID_PARTNER','Customer or supplier not found');return partner;
}
export async function balance(db,companyId,id){return (await db.query('SELECT COALESCE(sum(amount_base),0) AS amount FROM partner_entries WHERE company_id=$1 AND partner_id=$2',[companyId,id])).rows[0].amount;}
export async function savePartner(pool,user,id,input){
  const body=z.object({id:z.string().min(1).max(100).optional(),kind:z.enum(['customer','supplier']),name:z.string().trim().min(1).max(200),creditLimit:nonnegative.default('0'),data:z.record(z.string(),z.unknown()).default({})}).strict().parse(input);
  id??=body.id??randomUUID();
  return transaction(pool,async db=>{
    const previous=(await db.query('SELECT kind FROM partners WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id])).rows[0];
    if(previous&&previous.kind!==body.kind)fail(409,'PARTNER_TYPE_PROTECTED','Partner account type cannot change');
    await db.query('INSERT INTO partners(company_id,id,kind,name,credit_limit,data) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,id) DO UPDATE SET name=excluded.name,credit_limit=excluded.credit_limit,data=partners.data||excluded.data',[user.companyId,id,body.kind,body.name,body.creditLimit,body.data]);
    await audit(db,user,'partner.save',id);return {id,...body,balance:await balance(db,user.companyId,id)};
  });
}
export async function requireShift(db,user,id,deviceId,{owner=true,open=true,warehouseId}={}){
  const row=(await db.query('SELECT s.*,c.branch_id FROM shifts s JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE s.company_id=$1 AND s.id=$2 FOR UPDATE OF s',[user.companyId,id])).rows[0];
  if(!row||!user.branches.includes(row.branch_id)||(open&&row.closed_at)||(owner&&row.user_id!==user.id)||(deviceId&&row.device_id!==deviceId))fail(409,'SHIFT_UNAVAILABLE','An open shift for this cashier and device is required');
  if(warehouseId){const warehouse=await requireWarehouse(db,user,warehouseId);if(warehouse.branch_id!==row.branch_id)fail(403,'SHIFT_BRANCH_MISMATCH','Cashbox and warehouse must belong to the same branch');}return row;
}
export const openShiftSchema=z.object({cashboxId:z.string().uuid(),deviceId:z.string().min(8).max(100),opening:nonnegative}).strict();
export async function openShift(pool,user,key,input){const body=openShiftSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,'shift.open',body,async()=>{
  const account=(await db.query('SELECT active,deleted_at FROM users WHERE company_id=$1 AND id=$2 FOR SHARE',[user.companyId,user.id])).rows[0];
  if(!account?.active||account.deleted_at)fail(403,'USER_UNAVAILABLE','حساب المستخدم غير متاح.');
  const box=(await db.query('SELECT * FROM cashboxes WHERE company_id=$1 AND id=$2',[user.companyId,body.cashboxId])).rows[0];if(!box||!user.branches.includes(box.branch_id))fail(403,'CASHBOX_DENIED','Cashbox outside user scope');
  const id=randomUUID();await db.query('INSERT INTO shifts(company_id,id,cashbox_id,user_id,device_id,opening) VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,id,body.cashboxId,user.id,body.deviceId,body.opening]);await audit(db,user,'shift.open',id,body);return {id,...body};
}));}
export async function shiftReport(db,user,id){
  const shift=await requireShift(db,user,id,undefined,{owner:false,open:false});
  if(shift.user_id!==user.id&&!user.permissions.includes('shifts.manage'))fail(403,'SHIFT_DENIED','Own shift or manager permission required');
  const base=await companyCurrency(db,user.companyId);
  const cash=(await db.query('SELECT currency,sum(amount) AS amount,sum(amount_base) AS amount_base FROM cash_entries WHERE company_id=$1 AND shift_id=$2 GROUP BY currency',[user.companyId,id])).rows;
  const expected={};for(const row of cash)expected[row.currency]=round(row.amount,(await currency(db,user.companyId,row.currency)).decimals);
  expected[base.code]=round(D(expected[base.code]??0).plus(shift.opening),base.decimals);
  const methods=(await db.query('SELECT method,direction,currency,sum(amount) AS amount FROM payments WHERE company_id=$1 AND shift_id=$2 GROUP BY method,direction,currency',[user.companyId,id])).rows;
  const sales=(await db.query("SELECT kind,count(*) AS count,COALESCE(sum(total_base),0) AS total FROM commercial_documents WHERE company_id=$1 AND shift_id=$2 GROUP BY kind",[user.companyId,id])).rows;
  return {shift,expected,methods,sales,expectedBase:round(D(shift.opening).plus(cash.reduce((sum,row)=>sum.plus(row.amount_base),D(0))),base.decimals)};
}
export async function closeShift(pool,user,key,id,input){const body=z.object({deviceId:z.string().min(8).max(100),counted:z.record(z.string(),nonnegative)}).strict().parse(input);return transaction(pool,db=>idempotent(db,user,key,`shift.close:${id}`,body,async()=>{
  await requireShift(db,user,id,body.deviceId);const report=await shiftReport(db,user,id),differences={};
  for(const code of new Set([...Object.keys(report.expected),...Object.keys(body.counted)])){const config=await currency(db,user.companyId,code);differences[code]=round(D(body.counted[code]??0).minus(report.expected[code]??0),config.decimals);}
  const result={...report,counted:body.counted,differences};await db.query('UPDATE shifts SET closed_at=now(),close_snapshot=$3 WHERE company_id=$1 AND id=$2',[user.companyId,id,result]);await db.query("INSERT INTO shift_events(company_id,id,shift_id,kind,snapshot,created_by) VALUES($1,$2,$3,'closed',$4,$5)",[user.companyId,randomUUID(),id,result,user.id]);await audit(db,user,'shift.close',id,{differences});return result;
}));}
export const paymentSchema=z.object({partnerId:z.string().min(1).max(100).optional(),shiftId:z.string().uuid(),deviceId:z.string().min(8).max(100),direction:z.enum(['in','out']),method:z.enum(['cash','card','transfer']),currency:z.string().regex(/^[A-Z]{3}$/),amount:positive,autoAllocate:z.boolean().default(false),allocations:z.array(z.object({documentId:z.string().uuid(),amount:positive}).strict()).max(200).default([])}).strict();
export async function outstanding(db,companyId,id){
  const row=(await db.query(`SELECT d.total-COALESCE((SELECT sum(total) FROM commercial_documents r WHERE r.company_id=d.company_id AND r.original_id=d.id),0)-COALESCE((SELECT sum(amount) FROM payment_allocations a WHERE a.company_id=d.company_id AND a.document_id=d.id),0) AS amount FROM commercial_documents d WHERE d.company_id=$1 AND d.id=$2`,[companyId,id])).rows[0];return D(row?.amount??0);
}
export async function recordPayment(db,user,input,{documentId,alreadyLocked=false,linkedRefundCarryingBase,refundDocumentAmount}={}){
  const body=paymentSchema.parse(input);if(!alreadyLocked)await requireShift(db,user,body.shiftId,body.deviceId);
  const partner=await lockPartner(db,user,body.partnerId),payCurrency=await currency(db,user.companyId,body.currency),base=await companyCurrency(db,user.companyId);
  const baseValue=D(round(D(body.amount).mul(payCurrency.rate),base.decimals));
  if(baseValue.lte(0))fail(400,'PAYMENT_ROUNDS_TO_ZERO','Payment is below currency precision');
  if(body.method==='cash'&&body.direction==='out'){
    const shift=(await db.query('SELECT opening FROM shifts WHERE company_id=$1 AND id=$2',[user.companyId,body.shiftId])).rows[0];
    const available=D((await db.query('SELECT COALESCE(sum(amount),0) amount FROM cash_entries WHERE company_id=$1 AND shift_id=$2 AND currency=$3',[user.companyId,body.shiftId,body.currency])).rows[0].amount).plus(body.currency===base.code?shift.opening:0);
    if(D(body.amount).gt(available))fail(409,'INSUFFICIENT_CASH','Cash payment exceeds available cash in this shift');
  }
  const normal=!partner||((partner.kind==='customer')===(body.direction==='in'));
  if(!partner&&!documentId)fail(400,'PARTNER_REQUIRED','Standalone payment needs a partner');
  if(partner&&!normal&&linkedRefundCarryingBase===undefined&&(D(await balance(db,user.companyId,partner.id)).gte(0)||baseValue.gt(D(await balance(db,user.companyId,partner.id)).abs())))fail(409,'NO_CREDIT_TO_REFUND','Refund exceeds available partner credit');
  if(!normal&&body.allocations.length)fail(400,'REFUND_ALLOCATION','Refunds cannot allocate positive invoices');
  let allocations=body.allocations;
  if(body.autoAllocate&&partner&&normal){
    const rows=(await db.query("SELECT id,currency FROM commercial_documents WHERE company_id=$1 AND partner_id=$2 AND kind=$3 AND warehouse_id=ANY($4::uuid[]) ORDER BY created_at,id FOR UPDATE",[user.companyId,partner.id,partner.kind==='customer'?'sale':'purchase',user.warehouses])).rows;
    allocations=[];let remaining=baseValue;
    for(const row of rows){const due=await outstanding(db,user.companyId,row.id),rate=await currency(db,user.companyId,row.currency);if(due.gt(0)&&remaining.gt(0)){const value=DecimalMin(due,remaining.div(rate.rate)).toDecimalPlaces(rate.decimals,1);if(value.gt(0)){allocations.push({documentId:row.id,amount:value.toString()});remaining=remaining.minus(value.mul(rate.rate));}}}
  }
  if(new Set(allocations.map(row=>row.documentId)).size!==allocations.length)fail(400,'DUPLICATE_ALLOCATION','Invoice allocated twice');
  let carrying=D(0),settlement=D(0);const prepared=[];
  for(const entry of [...allocations].sort((a,b)=>a.documentId.localeCompare(b.documentId))){
    const document=(await db.query('SELECT * FROM commercial_documents WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,entry.documentId])).rows[0];
    if(!document||document.partner_id!==(partner?.id??null)||!['sale','purchase'].includes(document.kind))fail(400,'INVALID_ALLOCATION','Invoice is not payable by this account');
    await requireWarehouse(db,user,document.warehouse_id);const due=await outstanding(db,user.companyId,document.id);
    if(D(entry.amount).gt(due))fail(409,'OVER_ALLOCATION','Payment exceeds remaining invoice amount');
    const current=await currency(db,user.companyId,document.currency),book=D(round(D(entry.amount).mul(document.exchange_rate),base.decimals)),paid=D(round(D(entry.amount).mul(current.rate),base.decimals));carrying=carrying.plus(book);settlement=settlement.plus(paid);prepared.push({...entry,book,paid});
  }
  if(settlement.gt(baseValue))fail(409,'PAYMENT_TOO_SMALL','Payment does not cover allocations at current exchange rates');
  const fx=linkedRefundCarryingBase!==undefined?baseValue.minus(linkedRefundCarryingBase).mul(partner?.kind==='supplier'?1:-1):settlement.minus(carrying).mul(partner?.kind==='supplier'?-1:1),id=randomUUID(),number=await nextNumber(db,user.companyId,'pay');
  await db.query('INSERT INTO payments(company_id,id,number,partner_id,document_id,shift_id,direction,method,currency,amount,exchange_rate,amount_base,fx_base,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[user.companyId,id,number,partner?.id??null,documentId??null,body.shiftId,body.direction,body.method,body.currency,body.amount,payCurrency.rate,baseValue.toString(),fx.toString(),{...body,...(refundDocumentAmount===undefined?{}:{refundDocumentAmount}),allocations:prepared.map(row=>({...row,book:row.book.toString(),paid:row.paid.toString()}))},user.id]);
  for(const entry of prepared)await db.query('INSERT INTO payment_allocations(company_id,payment_id,document_id,amount,carrying_base,settlement_base) VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,id,entry.documentId,entry.amount,entry.book.toString(),entry.paid.toString()]);
  if(partner){const decrease=carrying.plus(baseValue.minus(settlement)),entry=normal?decrease.neg():D(linkedRefundCarryingBase??baseValue);await db.query('INSERT INTO partner_entries(id,company_id,partner_id,document_id,payment_id,amount_base,currency,amount,created_at) VALUES($1,$2,$3,NULL,$4,$5,$6,$7,now())',[randomUUID(),user.companyId,partner.id,id,entry.toString(),body.currency,normal?D(body.amount).neg().toString():body.amount]);}
  if(body.method==='cash')await db.query('INSERT INTO cash_entries VALUES($1,$2,$3,$4,$5,$6,$7,now())',[randomUUID(),user.companyId,body.shiftId,id,body.currency,body.direction==='in'?body.amount:D(body.amount).neg().toString(),body.direction==='in'?baseValue.toString():baseValue.neg().toString()]);
  await audit(db,user,'payment.post',id,{number});return {id,number,amount:body.amount,currency:body.currency,amountBase:baseValue.toString(),fxBase:fx.toString()};
}
function DecimalMin(a,b){return a.lt(b)?a:b;}
export async function postPayment(pool,user,key,input){const body=paymentSchema.parse(input);return transaction(pool,db=>idempotent(db,user,key,'payment.post',body,()=>recordPayment(db,user,body)));}
