import {z} from 'zod';
import {transaction} from '../db/pool.js';
import {audit} from './common.js';
import {fail} from '../http/errors.js';

export async function saveStockSettings(pool,user,input){
  const {allowNegativeStock}=z.object({allowNegativeStock:z.boolean()}).strict().parse(input);
  return transaction(pool,async db=>{
    const previous=(await db.query('SELECT allow_negative_stock FROM companies WHERE id=$1 FOR UPDATE',[user.companyId])).rows[0];
    if(!previous)fail(404,'NOT_FOUND','الشركة غير موجودة.');
    await db.query('UPDATE companies SET allow_negative_stock=$2 WHERE id=$1',[user.companyId,allowNegativeStock]);
    await audit(db,user,'stock.settings',user.companyId,{previous:previous.allow_negative_stock,allowNegativeStock});
    return {allowNegativeStock};
  });
}
