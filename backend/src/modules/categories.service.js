import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction} from '../db/pool.js';
import {fail} from '../http/errors.js';
import {audit} from './common.js';

const idSchema=z.string().min(1).max(100);
const inputSchema=z.object({name:z.string().trim().min(1).max(100).transform(value=>value.normalize('NFC'))}).strict();
export async function listCategories(db,companyId){
 const items=(await db.query(`SELECT c.id,c.name,count(p.id)::integer AS "productCount",count(p.id) FILTER(WHERE p.archived_at IS NULL)::integer AS "activeProductCount" FROM categories c LEFT JOIN products p ON p.company_id=c.company_id AND p.category_id=c.id WHERE c.company_id=$1 GROUP BY c.company_id,c.id,c.name,c.sort_position ORDER BY c.sort_position,lower(c.name),c.id`,[companyId])).rows;
 return {items};
}
export async function saveCategory(pool,user,id,input){
 const data=inputSchema.parse(input);if(id!==undefined)idSchema.parse(id);
 return transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
  if(id!==undefined&&!(await db.query('SELECT id FROM categories WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id])).rowCount)fail(404,'NOT_FOUND','التصنيف غير موجود / Category not found');
  const duplicate=await db.query('SELECT id FROM categories WHERE company_id=$1 AND lower(btrim(name))=lower($2) AND ($3::text IS NULL OR id<>$3)',[user.companyId,data.name,id??null]);
  if(duplicate.rowCount)fail(409,'CATEGORY_NAME_EXISTS','يوجد تصنيف بهذا الاسم / Category name already exists');
  if(id===undefined){id=randomUUID();await db.query('INSERT INTO categories(company_id,id,name) VALUES($1,$2,$3)',[user.companyId,id,data.name]);}
  else await db.query('UPDATE categories SET name=$3 WHERE company_id=$1 AND id=$2',[user.companyId,id,data.name]);
  await audit(db,user,'category.save',id,{name:data.name});return {id,...data};
 });
}
export async function deleteCategory(pool,user,id){
 idSchema.parse(id);
 return transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
  if(!(await db.query('SELECT id FROM categories WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,id])).rowCount)fail(404,'NOT_FOUND','التصنيف غير موجود / Category not found');
  // Archived products retain their links and are included in this check.
  if((await db.query('SELECT 1 FROM products WHERE company_id=$1 AND category_id=$2 LIMIT 1',[user.companyId,id])).rowCount)fail(409,'CATEGORY_IN_USE','لا يمكن حذف تصنيف مرتبط بمنتجات، بما فيها المؤرشفة / Category is linked to products, including archived products');
  await db.query('DELETE FROM categories WHERE company_id=$1 AND id=$2',[user.companyId,id]);await audit(db,user,'category.delete',id);return {id,deleted:true};
 });
}

export async function moveCategory(pool,user,id,input){
 idSchema.parse(id);const {direction}=z.object({direction:z.enum(['up','down'])}).strict().parse(input);
 return transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
  const ids=(await db.query('SELECT id FROM categories WHERE company_id=$1 ORDER BY sort_position,lower(name),id FOR UPDATE',[user.companyId])).rows.map(row=>row.id);
  const index=ids.indexOf(id);if(index<0)fail(404,'NOT_FOUND','التصنيف غير موجود / Category not found');
  const target=index+(direction==='up'?-1:1);
  if(target>=0&&target<ids.length){
   [ids[index],ids[target]]=[ids[target],ids[index]];
   await db.query('UPDATE categories c SET sort_position=(p.ordinality-1)::integer FROM unnest($2::text[]) WITH ORDINALITY p(id,ordinality) WHERE c.company_id=$1 AND c.id=p.id',[user.companyId,ids]);
   await audit(db,user,'category.order',id,{direction});
  }
  return listCategories(db,user.companyId);
 });
}
