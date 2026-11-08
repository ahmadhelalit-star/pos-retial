import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { requireWarehouse } from './auth.service.js';
import { lockPartner,outstanding } from './accounts.service.js';
import { positive,D,round,currency,companyCurrency } from './money.js';
import { idempotent,audit } from './common.js';
export async function allocateCredit(pool,user,key,id,input){
  const body=z.object({allocations:z.array(z.object({documentId:z.string().uuid(),amount:positive}).strict()).min(1).max(200)}).strict().parse(input);
  return transaction(pool,db=>idempotent(db,user,key,`credit.allocate:${id}`,body,async()=>{
    const source=(await db.query('SELECT partner_id FROM payments WHERE company_id=$1 AND id=$2',[user.companyId,id])).rows[0];if(!source?.partner_id)fail(404,'NOT_FOUND','Partner payment not found');
    const partner=await lockPartner(db,user,source.partner_id),payment=(await db.query('SELECT p.*,c.branch_id FROM payments p JOIN shifts s ON s.company_id=p.company_id AND s.id=p.shift_id JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE p.company_id=$1 AND p.id=$2 FOR UPDATE OF p',[user.companyId,id])).rows[0];
    if(!payment||!user.branches.includes(payment.branch_id))fail(403,'SCOPE_DENIED','Payment outside scope');
    if((partner.kind==='customer')!==(payment.direction==='in'))fail(400,'INVALID_CREDIT','Only incoming customer or outgoing supplier payments can allocate');
    if(new Set(body.allocations.map(row=>row.documentId)).size!==body.allocations.length)fail(400,'DUPLICATE_ALLOCATION','Repeated invoice');
    const allocated=(await db.query('SELECT COALESCE(sum(settlement_base),0) amount FROM payment_allocations WHERE company_id=$1 AND payment_id=$2',[user.companyId,id])).rows[0].amount;
    let available=D(payment.amount_base).minus(allocated),carrying=D(0),settlement=D(0);const base=await companyCurrency(db,user.companyId);
    for(const entry of [...body.allocations].sort((a,b)=>a.documentId.localeCompare(b.documentId))){
      const document=(await db.query('SELECT * FROM commercial_documents WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,entry.documentId])).rows[0];if(!document||document.partner_id!==partner.id||document.kind!==(partner.kind==='customer'?'sale':'purchase'))fail(400,'INVALID_ALLOCATION','Invoice does not belong to this account');await requireWarehouse(db,user,document.warehouse_id);
      if(D(entry.amount).gt(await outstanding(db,user.companyId,document.id)))fail(409,'OVER_ALLOCATION','Allocation exceeds remaining invoice');const rate=await currency(db,user.companyId,document.currency),book=D(round(D(entry.amount).mul(document.exchange_rate),base.decimals)),paid=D(round(D(entry.amount).mul(rate.rate),base.decimals));
      if(paid.gt(available))fail(409,'CREDIT_EXHAUSTED','Payment credit is already consumed');available=available.minus(paid);carrying=carrying.plus(book);settlement=settlement.plus(paid);
      await db.query('INSERT INTO payment_allocations(company_id,payment_id,document_id,amount,carrying_base,settlement_base) VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,id,entry.documentId,entry.amount,book.toString(),paid.toString()]);
    }
    const delta=settlement.minus(carrying),eventId=randomUUID(),fx=delta.mul(partner.kind==='supplier'?-1:1);
    await db.query('INSERT INTO allocation_events(company_id,id,payment_id,fx_base,created_by) VALUES($1,$2,$3,$4,$5)',[user.companyId,eventId,id,fx.toString(),user.id]);
    if(!delta.eq(0))await db.query('INSERT INTO partner_entries(id,company_id,partner_id,payment_id,amount_base,currency,amount) VALUES($1,$2,$3,$4,$5,$6,0)',[randomUUID(),user.companyId,partner.id,id,delta.toString(),base.code]);
    await audit(db,user,'credit.allocate',id,{eventId});return {eventId,paymentId:id,remainingBase:available.toString(),fxBase:fx.toString()};
  }));
}
