import {z} from 'zod';
import {transaction} from '../db/pool.js';
import {audit} from './common.js';
import {fail} from '../http/errors.js';
import {currencyCodes} from '../../../shared/currencies.js';
export async function setBaseCurrency(pool,user,input){
 const {code}=z.object({code:z.string().refine(value=>currencyCodes.includes(value),'Select a supported currency')}).strict().parse(input);
 return transaction(pool,async db=>{const company=(await db.query('SELECT base_currency FROM companies WHERE id=$1',[user.companyId])).rows[0];if(company.base_currency===code)return {code,unchanged:true};
  const historyQuery=`SELECT EXISTS(SELECT 1 FROM commercial_documents WHERE company_id=$1 UNION ALL SELECT 1 FROM stock_ledger WHERE company_id=$1 UNION ALL SELECT 1 FROM shifts WHERE company_id=$1 UNION ALL SELECT 1 FROM payments WHERE company_id=$1 UNION ALL SELECT 1 FROM partner_openings WHERE company_id=$1 UNION ALL SELECT 1 FROM commercial_orders WHERE company_id=$1) present`;
  const history=(await db.query(historyQuery,[user.companyId])).rows[0].present;
  if(history)fail(409,'BASE_CURRENCY_MIGRATION_REQUIRED','توجد فواتير أو أرصدة؛ تغيير العملة الأساسية يحتاج ترحيلًا محاسبيًا مع نسخة احتياطية.');
  try{await db.query('SET LOCAL lock_timeout=\'5s\'');await db.query('LOCK TABLE commercial_documents,stock_ledger,shifts,payments,partner_openings,commercial_orders,products IN SHARE ROW EXCLUSIVE MODE');}catch(error){if(error.code==='42501'||error.code==='55P03')fail(409,'CURRENCY_MAINTENANCE_REQUIRED','تغيير العملة الأساسية يتطلب إيقاف العمليات ووضع الصيانة.');throw error;}
  await db.query('SELECT base_currency FROM companies WHERE id=$1 FOR UPDATE',[user.companyId]);if((await db.query(historyQuery,[user.companyId])).rows[0].present)fail(409,'BASE_CURRENCY_MIGRATION_REQUIRED','بدأت عمليات مالية؛ يلزم ترحيل العملة في وضع الصيانة.');
  const configured=(await db.query('SELECT rate FROM company_currencies WHERE company_id=$1 AND code=$2',[user.companyId,code])).rows[0];if(configured&&Number(configured.rate)!==1)fail(409,'BASE_CURRENCY_MIGRATION_REQUIRED','سعر الصرف الحالي يحتاج ترحيلًا محاسبيًا؛ لا يمكن تغيير أرقام الحسابات من هذا الاختيار.');
  await db.query('INSERT INTO currencies(code,decimals) VALUES($1,$2) ON CONFLICT(code) DO NOTHING',[code,new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits]);
  await db.query('INSERT INTO company_currencies(company_id,code,rate) VALUES($1,$2,1) ON CONFLICT(company_id,code) DO UPDATE SET rate=1',[user.companyId,code]);await db.query('UPDATE companies SET base_currency=$2 WHERE id=$1',[user.companyId,code]);await audit(db,user,'currency.base.configure',code,{previous:company.base_currency});return {code};
 });
}
