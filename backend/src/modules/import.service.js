import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { hash,audit } from './common.js';
import { parseProduct } from './products.service.js';
import { writeProduct } from './products.repository.js';
import { requireWarehouse } from './auth.service.js';
import { insertMovement } from './stock.service.js';

export const importSchema=z.object({products:z.array(z.unknown()).min(1).max(2000),warehouseId:z.string().uuid()}).strict();
export async function previewImport(db,user,input) {
  const body=importSchema.parse(input);
  await requireWarehouse(db,user,body.warehouseId);
  const errors=[],products=[],ids=new Set(),barcodes=new Set(),skus=new Set();
  for(const [index,row] of body.products.entries()){
    try{
      if(row?.id===undefined) throw new Error('Legacy product id required for stable migration');
      const product=parseProduct(row),id=String(product.id);
      if(ids.has(id)) throw new Error('Duplicate product id'); ids.add(id);
      if((await db.query('SELECT 1 FROM products WHERE company_id=$1 AND id=$2',[user.companyId,id])).rowCount) throw new Error('Product id already exists');
      if(product.type!=='stock' && (Number(product.stock??0)!==0||product.variants.some(variant=>Number(variant.stock)!==0))) throw new Error('Non-stock/service cannot import a stock balance');
      if(product.variants.length && Math.abs(product.variants.reduce((sum,variant)=>sum+Number(variant.stock),0)-Number(product.stock??0))>1e-9) throw new Error('Parent and variant opening balances disagree');
      for(const sku of [product.sku,...product.variants.map(variant=>variant.sku)].filter(Boolean)){
        if(skus.has(sku)) throw new Error('Duplicate SKU');skus.add(sku);
        if((await db.query('SELECT 1 FROM products WHERE company_id=$1 AND sku=$2 UNION ALL SELECT 1 FROM product_variants WHERE company_id=$1 AND sku=$2',[user.companyId,sku])).rowCount) throw new Error('SKU already exists');
      }
      for(const barcode of [...product.units,...product.variants].map(entry=>entry.barcode).filter(Boolean)){
        if(barcodes.has(barcode)) throw new Error('Duplicate barcode');barcodes.add(barcode);
        if((await db.query('SELECT 1 FROM product_barcodes WHERE company_id=$1 AND barcode=$2',[user.companyId,barcode])).rowCount) throw new Error('Barcode already exists');
      }
      products.push(product);
    }catch(error){errors.push({index,id:row?.id??null,message:error.message});}
  }
  return {valid:errors.length===0,count:body.products.length,errors,contentHash:hash(JSON.stringify(body)),products};
}
export async function commitImport(pool,user,input) {
  const body=importSchema.parse(input),contentHash=hash(JSON.stringify(body));
  return transaction(pool,async db=>{
    await requireWarehouse(db,user,body.warehouseId);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`catalog:${user.companyId}`]);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`import:${user.companyId}:${contentHash}`]);
    const previous=(await db.query('SELECT report FROM import_batches WHERE company_id=$1 AND content_hash=$2',[user.companyId,contentHash])).rows[0];
    if(previous)return {...previous.report,replayed:true};
    const preview=await previewImport(db,user,body);
    if(!preview.valid)fail(422,'IMPORT_INVALID','Import validation failed; no changes applied',preview.errors);
    const company=(await db.query('SELECT base_currency FROM companies WHERE id=$1',[user.companyId])).rows[0];
    const id=randomUUID();
    for(const product of preview.products){
      const currency=product.currency??company.base_currency;
      if(!(await db.query('SELECT 1 FROM company_currencies WHERE company_id=$1 AND code=$2',[user.companyId,currency])).rowCount)fail(422,'CURRENCY_NOT_CONFIGURED','Import currency not configured');
      await writeProduct(db,user.companyId,product,{baseCurrency:company.base_currency});
      const variants=product.variants.length?product.variants:[{id:'',stock:product.stock??0,costPrice:product.costPrice??0}];
      if(product.type==='stock')for(const variant of variants)if(Number(variant.stock)>0)await insertMovement(db,user,{productId:product.id,variantId:variant.id,warehouseId:body.warehouseId,unitId:product.baseUnitId,quantity:Number(variant.stock),unitCost:Number(variant.costPrice??product.costPrice??0),kind:'opening',reference:`import:${id}`,lineKey:JSON.stringify([String(product.id),variant.id])});
    }
    const report={id,contentHash,imported:preview.products.length,errors:[],replayed:false};
    await db.query('INSERT INTO import_batches(id,company_id,content_hash,original_products,report,created_by) VALUES($1,$2,$3,$4,$5,$6)',[id,user.companyId,contentHash,JSON.stringify(body.products),report,user.id]);
    await audit(db,user,'import.commit',id,{count:report.imported});return report;
  });
}
