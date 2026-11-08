import { fail } from '../http/errors.js';

export async function getProduct(db,companyId,id,warehouseId,{includeArchived=false}={}) {
  const row=(await db.query(`SELECT data,version,archived_at FROM products WHERE company_id=$1 AND id=$2 ${includeArchived?'':'AND archived_at IS NULL'}`,[companyId,String(id)])).rows[0];
  if (!row) fail(404,'NOT_FOUND','Product not found');
  const balances=(await db.query('SELECT variant_id,quantity,average_cost FROM stock_balances WHERE company_id=$1 AND product_id=$2 AND warehouse_id=$3',[companyId,String(id),warehouseId])).rows;
  const stock=new Map(balances.map(entry=>[entry.variant_id,entry]));
  const product={...row.data,version:row.version,archived:Boolean(row.archived_at)};
  product.variants=(product.variants??[]).map(variant=>({...variant,stock:Number(stock.get(variant.id)?.quantity??0),costPrice:Number(stock.get(variant.id)?.average_cost??variant.costPrice??0)}));
  product.stock=product.variants.length ? product.variants.reduce((sum,variant)=>sum+variant.stock,0) : Number(stock.get('')?.quantity??0);
  product.costPrice=Number(stock.get('')?.average_cost??product.costPrice??0);
  return product;
}

export async function listProducts(db,companyId,query,warehouseId) {
  const values=[companyId];
  const conditions=['p.company_id=$1','p.archived_at IS NULL'];
  if(query.q){values.push(`%${query.q.replace(/[\\%_]/g,'\\$&')}%`);conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR EXISTS(SELECT 1 FROM product_barcodes b WHERE b.company_id=p.company_id AND b.product_id=p.id AND b.barcode ILIKE $${values.length}))`);}
  if(query.category){values.push(query.category);conditions.push(`p.category_id=$${values.length}`);}
  if(query.type){values.push(query.type);conditions.push(`p.type=$${values.length}`);}
  if(query.stock && query.stock!=='all'){
    values.push(warehouseId); const warehouseParam=values.length;
    const total=`COALESCE((SELECT sum(quantity) FROM stock_balances s WHERE s.company_id=p.company_id AND s.product_id=p.id AND s.warehouse_id=$${warehouseParam}),0)`;
    conditions.push("p.type='stock'");
    conditions.push(query.stock==='out_of_stock'?`${total}<=0`:query.stock==='low_stock'?`${total}>0 AND ${total}<=10`:`${total}>10`);
  }
  const where=conditions.join(' AND ');
  const total=Number((await db.query(`SELECT count(*) FROM products p WHERE ${where}`,values)).rows[0].count);
  values.push(query.limit,(query.page-1)*query.limit);
  const rows=(await db.query(`SELECT p.id FROM products p WHERE ${where} ORDER BY lower(p.name),p.id LIMIT $${values.length-1} OFFSET $${values.length}`,values)).rows;
  const items=[];
  for(const row of rows) items.push(await getProduct(db,companyId,row.id,warehouseId));
  return {items,total,page:query.page,limit:query.limit,warehouseId};
}

export async function writeProduct(db,companyId,product,{existing=false,baseCurrency}={}) {
  const id=String(product.id);
  if(product.category) await db.query('INSERT INTO categories(company_id,id,name) VALUES($1,$2,$2) ON CONFLICT DO NOTHING',[companyId,product.category]);
  const document={...product,currency:product.currency??baseCurrency,stock:0,variants:product.variants.map(variant=>({...variant,stock:0}))};
  delete document.version; delete document.archived;
  if(existing) await db.query('UPDATE products SET name=$3,type=$4,sku=$5,category_id=$6,tax_id=$7,currency=$8,allow_fractional=$9,data=$10,version=version+1 WHERE company_id=$1 AND id=$2',[companyId,id,product.name,product.type,product.sku||null,product.category||null,product.taxId||null,document.currency,product.allowFractional,document]);
  else await db.query('INSERT INTO products(company_id,id,name,type,sku,category_id,tax_id,currency,allow_fractional,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[companyId,id,product.name,product.type,product.sku||null,product.category||null,product.taxId||null,document.currency,product.allowFractional,document]);
  for(const unit of product.units){
    await db.query('INSERT INTO units_of_measure(company_id,id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[companyId,unit.name,unit.name]);
    await db.query('INSERT INTO product_units(company_id,product_id,id,name,factor,price,sell,purchase,is_base) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(company_id,product_id,id) DO UPDATE SET name=excluded.name,factor=excluded.factor,price=excluded.price,sell=excluded.sell,purchase=excluded.purchase,is_base=excluded.is_base',[companyId,id,unit.id,unit.name,unit.factor,unit.price,unit.sell===true,unit.purchase===true,unit.id===product.baseUnitId]);
  }
  await db.query('DELETE FROM product_attributes WHERE company_id=$1 AND product_id=$2',[companyId,id]);
  for(const attribute of product.attributes) await db.query('INSERT INTO product_attributes VALUES($1,$2,$3,$4)',[companyId,id,attribute.name,JSON.stringify(attribute.values)]);
  const variants=product.variants.length?product.variants:[{id:'',sku:null,values:{},price:product.price}];
  for(const variant of variants) await db.query('INSERT INTO product_variants(company_id,product_id,id,sku,attribute_values,price) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,product_id,id) DO UPDATE SET sku=excluded.sku,attribute_values=excluded.attribute_values,price=excluded.price',[companyId,id,variant.id,variant.sku||null,variant.values,variant.price]);
  await db.query('DELETE FROM variant_unit_prices WHERE company_id=$1 AND product_id=$2',[companyId,id]);
  for(const variant of product.variants) for(const [unitId,price] of Object.entries(variant.unitPrices??{})) await db.query('INSERT INTO variant_unit_prices VALUES($1,$2,$3,$4,$5)',[companyId,id,variant.id,unitId,price]);
  await db.query('DELETE FROM product_barcodes WHERE company_id=$1 AND product_id=$2',[companyId,id]);
  for(const unit of product.units) if(unit.barcode) await db.query('INSERT INTO product_barcodes VALUES($1,$2,$3,$4,NULL)',[companyId,unit.barcode,id,unit.id]);
  for(const variant of product.variants) if(variant.barcode) await db.query('INSERT INTO product_barcodes VALUES($1,$2,$3,NULL,$4)',[companyId,variant.barcode,id,variant.id]);
}
