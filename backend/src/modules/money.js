import Decimal from 'decimal.js';
import { z } from 'zod';
import { fail } from '../http/errors.js';
Decimal.set({precision:48,rounding:Decimal.ROUND_HALF_UP});
export const D=value=>new Decimal(value??0);
export const amount=z.union([z.number().finite(),z.string().regex(/^-?\d{1,15}(\.\d{1,9})?$/)]).transform(value=>String(value));
export const positive=amount.refine(value=>D(value).gt(0),'Must be positive');
export const nonnegative=amount.refine(value=>D(value).gte(0),'Must be nonnegative');
export const round=(value,places=2)=>D(value).toDecimalPlaces(places).toFixed(places);
export function allocateLineAmounts(line,already,quantity,decimals){
  const result={};
  for(const field of ['net','discount','tax'])result[field]=round(D(round(D(line[field]).mul(D(already).plus(quantity)).div(line.quantity),decimals)).minus(round(D(line[field]).mul(already).div(line.quantity),decimals)),decimals);
  result.subtotal=round(D(result.net).plus(result.discount),decimals);result.total=round(D(result.net).plus(result.tax),decimals);return result;
}
export async function currency(db,companyId,code){
  const row=(await db.query('SELECT cc.code,cc.rate,c.decimals FROM company_currencies cc JOIN currencies c ON c.code=cc.code WHERE cc.company_id=$1 AND cc.code=$2 FOR SHARE OF cc',[companyId,code])).rows[0];
  if(!row)fail(400,'CURRENCY_NOT_CONFIGURED','Configure the currency first');return row;
}
export async function companyCurrency(db,companyId){const row=(await db.query('SELECT base_currency FROM companies WHERE id=$1',[companyId])).rows[0];return currency(db,companyId,row.base_currency);}
export async function nextNumber(db,companyId,kind){const value=(await db.query('INSERT INTO document_counters VALUES($1,$2,1) ON CONFLICT(company_id,kind) DO UPDATE SET value=document_counters.value+1 RETURNING value',[companyId,kind])).rows[0].value;return `${kind.toUpperCase()}-${String(value).padStart(8,'0')}`;}
