import {z} from 'zod';
import {transaction} from '../db/pool.js';
import {audit} from './common.js';
import {fail} from '../http/errors.js';

export async function deleteCurrency(pool,user,value){
 const code=z.string().regex(/^[A-Z]{3}$/).parse(value);
 return transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
  const company=(await db.query('SELECT base_currency FROM companies WHERE id=$1 FOR SHARE',[user.companyId])).rows[0];
  if(company.base_currency===code)fail(409,'BASE_CURRENCY_REQUIRED','لا يمكن حذف العملة الأساسية للنظام.');
  const row=(await db.query('SELECT code,rate FROM company_currencies WHERE company_id=$1 AND code=$2 FOR UPDATE',[user.companyId,code])).rows[0];if(!row)fail(404,'NOT_FOUND','العملة غير موجودة في إعدادات هذا المتجر.');
  const usage=(await db.query(`SELECT
   (SELECT count(*) FROM products WHERE company_id=$1 AND (currency=$2 OR data->>'currency'=$2)) products,
   (SELECT count(*) FROM commercial_documents WHERE company_id=$1 AND currency=$2) documents,
   (SELECT count(*) FROM payments WHERE company_id=$1 AND currency=$2) payments,
   (SELECT count(*) FROM commercial_orders WHERE company_id=$1 AND snapshot->>'currency'=$2) orders,
   (SELECT count(*) FROM cash_entries WHERE company_id=$1 AND currency=$2)+(SELECT count(*) FROM partner_entries WHERE company_id=$1 AND currency=$2) entries`,[user.companyId,code])).rows[0];
  if(Object.values(usage).some(count=>Number(count)>0))fail(409,'CURRENCY_IN_USE',`لا يمكن حذف ${code} لأنها مستخدمة. المنتجات: ${usage.products}، الفواتير: ${usage.documents}، السندات: ${usage.payments}، الطلبات: ${usage.orders}، قيود الأرصدة: ${usage.entries}. غيّر عملة المنتجات أولًا إن كانت هي الارتباط الوحيد.`,usage);
  await db.query('DELETE FROM company_currencies WHERE company_id=$1 AND code=$2',[user.companyId,code]);await audit(db,user,'currency.delete',code,{rate:row.rate});return {deleted:true,code};
 });
}
export async function deleteTax(pool,user,value){
 const id=z.string().min(1).max(100).parse(value);
 return transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
  const row=(await db.query('SELECT id,name,rate FROM tax_configurations WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id])).rows[0];if(!row)fail(404,'NOT_FOUND','الضريبة غير موجودة.');
  const count=Number((await db.query("SELECT count(*) count FROM products WHERE company_id=$1 AND (tax_id=$2 OR data->>'taxId'=$2)",[user.companyId,id])).rows[0].count);
  if(count)fail(409,'TAX_IN_USE',`الضريبة مرتبطة بـ ${count} من المنتجات. غيّر الضريبة في هذه المنتجات أولًا، ثم احذفها.`,{products:count});
  await db.query('DELETE FROM tax_configurations WHERE company_id=$1 AND id=$2',[user.companyId,id]);await audit(db,user,'tax.delete',id,{name:row.name,rate:row.rate});return {deleted:true,id};
 });
}
