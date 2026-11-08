import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { validateProduct } from '../../../shared/catalog.js';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { audit } from './common.js';
import { getProduct,writeProduct } from './products.repository.js';
import { requireWarehouse } from './auth.service.js';

const idSchema=z.union([z.string().min(1).max(100),z.number().int().safe()]);
const shape=z.object({id:idSchema.optional(),name:z.string().trim().min(1).max(200),sku:z.string().trim().min(1).max(200).optional(),allowFractional:z.boolean().optional(),type:z.enum(['stock','service','nonStock']).optional(),price:z.number().finite().min(0).max(1e12),stock:z.number().finite().optional(),costPrice:z.number().finite().min(0).max(1e12).optional(),currency:z.string().regex(/^[A-Z]{3}$/).optional(),taxId:z.string().max(100).nullable().optional(),priceIncludesTax:z.boolean().nullable().optional(),scaleCode:z.string().regex(/^\d{5}$/).nullable().optional(),version:z.number().int().positive().optional()}).passthrough();
export function parseProduct(input) {
  const parsed=shape.parse(input);
  const document={...parsed,id:parsed.id??randomUUID()};
  try {
    const product=validateProduct(document);
    if(product.units.length>100||product.variants.length>2000||product.attributes.length>20) fail(400,'CATALOG_LIMIT','Product structure too large');
    for(const unit of product.units){z.string().min(1).max(100).parse(unit.id);z.string().max(200).parse(unit.barcode??'');}
    for(const variant of product.variants){z.string().min(1).max(100).parse(variant.id);z.string().max(200).parse(variant.barcode??'');}
    const base=product.units.find(unit=>unit.id===product.baseUnitId);
    if((product.barcode??'')!==(base.barcode??'')||Number(product.price)!==Number(base.price)) fail(400,'BASE_UNIT_MISMATCH','Base price/barcode must match product');
    return product;
  } catch(error) { if(error.status||error.name==='ZodError') throw error; fail(400,'INVALID_PRODUCT',error.message); }
}
export async function saveProduct(pool,user,id,input,warehouseId) {
  let product=parseProduct(input);
  if(id!==undefined && String(product.id)!==String(id)) fail(400,'ID_MISMATCH','Product id mismatch');
  return transaction(pool,async db=>{
    await requireWarehouse(db,user,warehouseId);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
    const company=(await db.query('SELECT base_currency FROM companies WHERE id=$1',[user.companyId])).rows[0];
    if(id!==undefined){
      await db.query('SELECT id FROM products WHERE company_id=$1 AND id=$2 FOR UPDATE',[user.companyId,String(id)]);
      const previous=await getProduct(db,user.companyId,id,warehouseId);
      product=parseProduct({...previous,...input});
      if(product.version!==previous.version) fail(409,'VERSION_CONFLICT','Product changed; reload before saving');
      if(Number(product.stock??0)!==previous.stock || product.variants.some(variant=>Number(variant.stock??0)!==Number(previous.variants.find(entry=>entry.id===variant.id)?.stock??0))) fail(409,'LEDGER_REQUIRED','Use a documented stock movement, not a catalog balance edit');
      const ledger=(await db.query('SELECT 1 FROM stock_ledger WHERE company_id=$1 AND product_id=$2 LIMIT 1',[user.companyId,String(id)])).rowCount;
      if(ledger && (product.type!==previous.type || product.allowFractional!==previous.allowFractional || Boolean(product.variants.length)!==Boolean(previous.variants.length) || product.baseUnitId!==previous.baseUnitId)) fail(409,'HISTORY_PROTECTED','Cannot restructure product with stock history');
      if(previous.units.some(unit=>!product.units.some(entry=>entry.id===unit.id))||previous.variants.some(variant=>!product.variants.some(entry=>entry.id===variant.id))) fail(409,'CATALOG_HISTORY_PROTECTED','Existing units and variants must be retained');
      if(ledger && product.allowFractional===false && previous.allowFractional===true && (await db.query('SELECT 1 FROM stock_balances WHERE company_id=$1 AND product_id=$2 AND quantity<>trunc(quantity) LIMIT 1',[user.companyId,String(id)])).rowCount) fail(409,'FRACTIONAL_STOCK_EXISTS','Fractional stock remains');
    }else if(Number(product.stock??0)!==0||product.variants.some(variant=>Number(variant.stock??0)!==0)) fail(409,'LEDGER_REQUIRED','Create with zero balance; post opening stock separately');
    const currency=product.currency??company.base_currency;
    const skus=[product.sku,...product.variants.map(variant=>variant.sku)].filter(Boolean);
    if(new Set(skus).size!==skus.length)fail(409,'DUPLICATE_SKU','SKU must be unique across the catalog');
    for(const sku of skus)if((await db.query('SELECT 1 FROM products WHERE company_id=$1 AND sku=$2 AND id<>$3 UNION ALL SELECT 1 FROM product_variants WHERE company_id=$1 AND sku=$2 AND product_id<>$3',[user.companyId,sku,String(product.id)])).rowCount)fail(409,'DUPLICATE_SKU','SKU already exists');
    if(!(await db.query('SELECT 1 FROM company_currencies WHERE company_id=$1 AND code=$2',[user.companyId,currency])).rowCount) fail(400,'CURRENCY_NOT_CONFIGURED','Currency not configured for company');
    await writeProduct(db,user.companyId,product,{existing:id!==undefined,baseCurrency:company.base_currency});
    await audit(db,user,id!==undefined?'product.update':'product.create',product.id);
    return getProduct(db,user.companyId,product.id,warehouseId);
  });
}
export async function archiveProduct(pool,user,id) {
  return transaction(pool,async db=>{
    const result=await db.query('UPDATE products SET archived_at=now(),version=version+1 WHERE company_id=$1 AND id=$2 AND archived_at IS NULL RETURNING id',[user.companyId,String(id)]);
    if(!result.rowCount) fail(404,'NOT_FOUND','Product not found');
    await audit(db,user,'product.archive',id); return {id,archived:true};
  });
}
