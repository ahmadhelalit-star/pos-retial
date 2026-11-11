import { readPresentation,savePresentation } from '../modules/presentation.service.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission,requireWarehouse } from '../modules/auth.service.js';
import { fail } from './errors.js';
import { pagination } from './controllers.js';
import { transaction } from '../db/pool.js';
import { audit } from '../modules/common.js';
import { calculateCart,bodyToCart,documentSchema,postDocument,reverseDocument } from '../modules/commerce.service.js';
import { savePartner,openShift,closeShift,shiftReport,postPayment } from '../modules/accounts.service.js';
import { createOrder,getOrder,convertQuotation,deliverOrder,invoiceOrder } from '../modules/orders.service.js';
import { moduleAccess } from '../modules/registry.js';
import { getProduct } from '../modules/products.repository.js';
import { createProductLine } from '../../../shared/catalog.js';
import { registerPrintRoutes } from '../modules/printing.service.js';
import { allocateCredit } from '../modules/credit-allocation.service.js';
import { D,round,companyCurrency } from '../modules/money.js';
import {dashboardTrend} from '../modules/dashboard-trend.service.js';

export function commercialRoutes({pool,licenseProvider,config}){
  const router=Router();
  const active=async(req,_res,next)=>{const license=req.activation??await licenseProvider();if(license?.status!=='ACTIVE'||license.product!=='retail'||license.activated!==true)fail(403,'ACTIVATION_REQUIRED','Activate Retail before commercial operations',{activationStatus:license?.status??'NOT_ACTIVATED'});req.activation=license;next();};
  const advanced=async(req,_res,next)=>{const enabled=(await pool.query("SELECT enabled FROM module_configuration WHERE company_id=$1 AND module_id='advancedSales'",[req.user.companyId])).rows[0]?.enabled;if(!moduleAccess('advancedSales',req.activation,enabled,req.user.permissions))fail(403,'MODULE_UNAVAILABLE','Advanced Sales license, setting and permission required');next();};
  const route=(method,path,permission,handler,...middleware)=>router[method](path,requirePermission(permission),active,...middleware,handler);
  route('post','/sales/quote','sales.post',async(req,res)=>{const body=documentSchema.parse(req.body);res.json(await calculateCart(pool,req.user,bodyToCart(body)));});
  route('post','/purchases/quote','purchases.post',async(req,res)=>{const body=documentSchema.parse(req.body);res.json(await calculateCart(pool,req.user,bodyToCart(body),'purchase'));});
  route('post','/sales','sales.post',async(req,res)=>{if(req.headers['x-retail-data-epoch']&&req.headers['x-retail-data-epoch']!==config?.dataEpoch)fail(409,'DATA_EPOCH_CHANGED','Database was restored; administrator review of the pending sale required');res.status(201).json(await postDocument(pool,req.user,req.headers['idempotency-key'],req.body,'sale'));});
  route('get','/sales/recovery/:key','sales.post',async(req,res)=>{const key=z.string().regex(/^[A-Za-z0-9:_-]{8,160}$/).parse(req.params.key);res.json(await transaction(pool,async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${req.user.companyId}:${key}`]);
    const row=(await db.query('SELECT operation,response FROM idempotency_requests WHERE company_id=$1 AND key=$2',[req.user.companyId,key])).rows[0];if(!row)return {found:false,epoch:config?.dataEpoch};
    if(row.operation!=='document.sale')fail(409,'RECOVERY_OPERATION_MISMATCH','Request belongs to another operation');const document=(await db.query('SELECT created_by,warehouse_id FROM commercial_documents WHERE company_id=$1 AND id=$2',[req.user.companyId,row.response.id])).rows[0];if(!document||document.created_by!==req.user.id)fail(403,'RECOVERY_DENIED','Request belongs to another cashier');await requireWarehouse(db,req.user,document.warehouse_id);return {found:true,result:row.response};
  }));});
  route('get','/users/:id','users.read',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),row=(await pool.query('SELECT id,username,name,active FROM users WHERE company_id=$1 AND id=$2',[req.user.companyId,id])).rows[0];if(!row)fail(404,'NOT_FOUND','User not found');
    const roleIds=(await pool.query('SELECT role_id FROM user_roles WHERE company_id=$1 AND user_id=$2',[req.user.companyId,id])).rows.map(row=>row.role_id),branches=(await pool.query('SELECT branch_id FROM user_branches WHERE company_id=$1 AND user_id=$2',[req.user.companyId,id])).rows.map(row=>row.branch_id),warehouses=(await pool.query('SELECT warehouse_id FROM user_warehouses WHERE company_id=$1 AND user_id=$2',[req.user.companyId,id])).rows.map(row=>row.warehouse_id);res.json({...row,roleIds,branches,warehouses});
  });
  route('post','/purchases','purchases.post',async(req,res)=>res.status(201).json(await postDocument(pool,req.user,req.headers['idempotency-key'],req.body,'purchase')));
  route('get','/document-options','payments.read',async(req,res)=>{
    const query=pagination.extend({kind:z.enum(['sale','purchase']),partnerId:z.string().min(1).max(100),q:z.string().max(100).default('')}).strict().parse(req.query),values=[req.user.companyId,req.user.warehouses,query.kind,query.partnerId,`%${query.q}%`],where='company_id=$1 AND warehouse_id=ANY($2::uuid[]) AND kind=$3 AND partner_id=$4 AND number ILIKE $5';
    const total=Number((await pool.query(`SELECT count(*) FROM commercial_documents WHERE ${where}`,values)).rows[0].count),items=(await pool.query(`SELECT id,number,total,currency FROM commercial_documents WHERE ${where} ORDER BY created_at DESC,id LIMIT $6 OFFSET $7`,[...values,query.limit,(query.page-1)*query.limit])).rows;res.json({items,total,...query});
  });
  for(const type of ['sales','purchases']){
    const kind=type==='sales'?'sale':'purchase';
    route('get',`/${type}`,`${type}.read`,async(req,res)=>{
      const query=pagination.extend({q:z.string().max(100).optional(),status:z.enum(['all','invoices','refunded']).default('all')}).strict().parse(req.query);
      const kinds=query.status==='refunded'?[`${kind}_return`]:query.status==='invoices'?[kind]:[kind,`${kind}_return`],values=[req.user.companyId,kinds,req.user.warehouses];let where='company_id=$1 AND kind=ANY($2::text[]) AND warehouse_id=ANY($3::uuid[])';
      if(query.q){values.push(`%${query.q}%`);where+=` AND number ILIKE $${values.length}`;}
      const total=Number((await pool.query(`SELECT count(*) FROM commercial_documents WHERE ${where}`,values)).rows[0].count),items=(await pool.query(`SELECT id,number,kind,total,currency,created_at,snapshot FROM commercial_documents WHERE ${where} ORDER BY created_at DESC,id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,query.limit,(query.page-1)*query.limit])).rows;res.json({items,total,...query});
    });
    route('post',`/${type}/:id/returns`,`${type}.return`,async(req,res)=>res.status(201).json(await reverseDocument(pool,req.user,req.headers['idempotency-key'],z.string().uuid().parse(req.params.id),req.body)));
  }
  route('post','/sales/:id/cancel','sales.cancel',async(req,res)=>res.status(201).json(await reverseDocument(pool,req.user,req.headers['idempotency-key'],z.string().uuid().parse(req.params.id),req.body,{cancel:true})));
  route('get','/documents/:id','catalog.read',async(req,res)=>{
    const row=(await pool.query('SELECT * FROM commercial_documents WHERE company_id=$1 AND id=$2',[req.user.companyId,z.string().uuid().parse(req.params.id)])).rows[0];if(!row)fail(404,'NOT_FOUND','Document not found');await requireWarehouse(pool,req.user,row.warehouse_id);if(!req.user.permissions.includes(row.kind.startsWith('sale')?'sales.read':'purchases.read'))fail(403,'PERMISSION_DENIED','Document permission required');const payments=(await pool.query('SELECT number,direction,method,currency,amount,exchange_rate,fx_base FROM payments WHERE company_id=$1 AND document_id=$2',[req.user.companyId,row.id])).rows;res.json({...row.snapshot,payments,cancelled:(await pool.query('SELECT 1 FROM document_cancellations WHERE company_id=$1 AND document_id=$2',[req.user.companyId,row.id])).rowCount>0});
  });
  route('get','/partners','partners.read',async(req,res)=>{
    const query=pagination.extend({kind:z.enum(['customer','supplier']).optional(),q:z.string().max(100).default(''),accountType:z.enum(['all','company','individual']).default('all')}).strict().parse(req.query),values=[req.user.companyId,query.kind??null,`%${query.q}%`];
    let condition="company_id=$1 AND ($2::text IS NULL OR kind=$2) AND (name ILIKE $3 OR data->>'phone' ILIKE $3 OR data->>'taxNumber' ILIKE $3 OR data->>'email' ILIKE $3) AND archived_at IS NULL";
    if(query.accountType!=='all'){values.push(query.accountType);condition+=` AND COALESCE(data->>'type','individual')=$${values.length}`;}
    const total=Number((await pool.query(`SELECT count(*) FROM partners WHERE ${condition}`,values)).rows[0].count),items=(await pool.query(`SELECT id,kind,name,credit_limit,data FROM partners WHERE ${condition} ORDER BY lower(name),id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,query.limit,(query.page-1)*query.limit])).rows;res.json({items,total,...query});
  });
  route('post','/partners','partners.manage',async(req,res)=>res.status(201).json(await savePartner(pool,req.user,undefined,req.body)));
  route('put','/partners/:id','partners.manage',async(req,res)=>res.json(await savePartner(pool,req.user,req.params.id,req.body)));
  route('get','/partners/:id/statement','payments.read',async(req,res)=>{
    const query=pagination.strict().parse(req.query),values=[req.user.companyId,req.params.id,req.user.warehouses,req.user.branches,req.user.roles.some(role=>role.is_admin)];
    const from='FROM partner_entries e LEFT JOIN commercial_documents d ON d.company_id=e.company_id AND d.id=e.document_id LEFT JOIN payments p ON p.company_id=e.company_id AND p.id=e.payment_id LEFT JOIN shifts s ON s.company_id=p.company_id AND s.id=p.shift_id LEFT JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE e.company_id=$1 AND e.partner_id=$2 AND (d.warehouse_id=ANY($3::uuid[]) OR c.branch_id=ANY($4::uuid[]) OR (e.opening_id IS NOT NULL AND $5))';
    const totals=(await pool.query(`SELECT count(*) total,COALESCE(sum(e.amount_base),0) balance ${from}`,values)).rows[0];const items=(await pool.query(`SELECT e.*,d.number AS document_number,p.number AS payment_number ${from} ORDER BY e.created_at,e.id LIMIT $6 OFFSET $7`,[...values,query.limit,(query.page-1)*query.limit])).rows;res.json({items,...totals,...query});
  });
  route('post','/payments','payments.post',async(req,res)=>res.status(201).json(await postPayment(pool,req.user,req.headers['idempotency-key'],req.body)));
  route('post','/payments/:id/allocate','payments.post',async(req,res)=>res.json(await allocateCredit(pool,req.user,req.headers['idempotency-key'],z.string().uuid().parse(req.params.id),req.body)));
  route('get','/payments','payments.read',async(req,res)=>{const query=pagination.strict().parse(req.query);const from='FROM payments p JOIN shifts s ON s.company_id=p.company_id AND s.id=p.shift_id JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE p.company_id=$1 AND c.branch_id=ANY($2::uuid[])';const items=(await pool.query(`SELECT p.*,(SELECT kind FROM partners WHERE company_id=p.company_id AND id=p.partner_id) partner_kind ${from} ORDER BY p.created_at DESC,p.id LIMIT $3 OFFSET $4`,[req.user.companyId,req.user.branches,query.limit,(query.page-1)*query.limit])).rows;res.json({items,total:Number((await pool.query(`SELECT count(*) ${from}`,[req.user.companyId,req.user.branches])).rows[0].count),...query});});
  route('post','/cashboxes','organization.manage',async(req,res)=>{const body=z.object({branchId:z.string().uuid(),name:z.string().min(1).max(200)}).strict().parse(req.body);if(!req.user.branches.includes(body.branchId))fail(403,'SCOPE_DENIED','Branch outside scope');const id=randomUUID();await transaction(pool,async db=>{await db.query('INSERT INTO cashboxes VALUES($1,$2,$3,$4)',[req.user.companyId,id,body.branchId,body.name]);await audit(db,req.user,'cashbox.create',id);});res.status(201).json({id,...body});});
  route('get','/shifts','shifts.read',async(req,res)=>{const items=(await pool.query('SELECT s.*,c.name AS cashbox_name FROM shifts s JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE s.company_id=$1 AND c.branch_id=ANY($2::uuid[]) AND (s.user_id=$3 OR $4) ORDER BY s.opened_at DESC LIMIT 100',[req.user.companyId,req.user.branches,req.user.id,req.user.permissions.includes('shifts.manage')])).rows;const cashboxes=(await pool.query('SELECT * FROM cashboxes WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name',[req.user.companyId,req.user.branches])).rows;res.json({items,cashboxes});});
  route('post','/shifts','shifts.open',async(req,res)=>res.status(201).json(await openShift(pool,req.user,req.headers['idempotency-key'],req.body)));
  route('get','/shifts/:id','shifts.read',async(req,res)=>res.json(await shiftReport(pool,req.user,z.string().uuid().parse(req.params.id))));
  route('post','/shifts/:id/close','shifts.close',async(req,res)=>res.json(await closeShift(pool,req.user,req.headers['idempotency-key'],z.string().uuid().parse(req.params.id),req.body)));
  route('post','/shifts/:id/reopen','shifts.manage',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({reason:z.string().trim().min(3).max(500)}).strict().parse(req.body);
    const result=await transaction(pool,async db=>{const report=await shiftReport(db,req.user,id);if(!report.shift.closed_at)fail(409,'SHIFT_ALREADY_OPEN','Shift is already open');await db.query('UPDATE shifts SET closed_at=NULL WHERE company_id=$1 AND id=$2',[req.user.companyId,id]);await db.query("INSERT INTO shift_events(company_id,id,shift_id,kind,reason,snapshot,created_by) VALUES($1,$2,$3,'reopened',$4,$5,$6)",[req.user.companyId,randomUUID(),id,body.reason,report,req.user.id]);await audit(db,req.user,'shift.reopen',id,body);return {id,reopened:true};});res.json(result);
  });
  route('get','/organization/presentation','organization.read',async(req,res)=>res.json(await readPresentation(pool,req.user.companyId)));
  route('put','/organization/presentation','organization.manage',async(req,res)=>res.json(await transaction(pool,db=>savePresentation(db,req.user,req.body))));
  route('get','/reports/basic','reports.read',async(req,res)=>{
    const query=z.object({from:z.iso.datetime().optional(),to:z.iso.datetime().optional(),trend:z.literal('1').optional()}).strict().parse(req.query),values=[req.user.companyId,req.user.warehouses,query.from??'1970-01-01T00:00:00Z',query.to??'9999-01-01T00:00:00Z'];
    if(query.trend&&(!query.from||!query.to||Date.parse(query.from)>=Date.parse(query.to)))fail(400,'INVALID_PERIOD','A valid start and end are required for the dashboard trend');
    const documents=(await pool.query("SELECT kind,count(*) count,sum(total_base) total_base,sum(tax*exchange_rate) tax_base,sum((subtotal-discount)*exchange_rate) net_base,sum(cost_base) cost_base FROM commercial_documents WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[]) AND created_at>=$3 AND created_at<$4 GROUP BY kind",values)).rows;
    const stock=(await pool.query('SELECT COALESCE(sum(quantity*average_cost),0) valuation,COALESCE(sum(quantity),0) quantity FROM stock_balances WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[])',[req.user.companyId,req.user.warehouses])).rows[0];
    const payments=(await pool.query('SELECT method,direction,currency,count(*) count,sum(p.amount) amount,sum(p.amount_base) amount_base,sum(p.fx_base) fx_base FROM payments p JOIN shifts s ON s.company_id=p.company_id AND s.id=p.shift_id JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE p.company_id=$1 AND c.branch_id=ANY($2::uuid[]) AND p.created_at>=$3 AND p.created_at<$4 GROUP BY method,direction,currency',[req.user.companyId,req.user.branches,values[2],values[3]])).rows;
    const allocationFx=(await pool.query('SELECT COALESCE(sum(e.fx_base),0) fx_base FROM allocation_events e JOIN payments p ON p.company_id=e.company_id AND p.id=e.payment_id JOIN shifts s ON s.company_id=p.company_id AND s.id=p.shift_id JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE e.company_id=$1 AND c.branch_id=ANY($2::uuid[]) AND e.created_at>=$3 AND e.created_at<$4',[req.user.companyId,req.user.branches,values[2],values[3]])).rows[0].fx_base;
    const baseCurrency=await companyCurrency(pool,req.user.companyId),roundBase=value=>round(value,baseCurrency.decimals);
    const amount=(kind,field)=>D(documents.find(row=>row.kind===kind)?.[field]??0);
    const summary={salesBase:roundBase(amount('sale','total_base').minus(amount('sale_return','total_base'))),purchasesBase:roundBase(amount('purchase','total_base').minus(amount('purchase_return','total_base'))),grossProfitBase:roundBase(amount('sale','net_base').minus(amount('sale_return','net_base')).minus(amount('sale','cost_base')).plus(amount('sale_return','cost_base'))),salesTaxBase:roundBase(amount('sale','tax_base').minus(amount('sale_return','tax_base'))),exchangeGainBase:roundBase(payments.reduce((sum,row)=>sum.plus(row.fx_base),D(allocationFx)))};
    const accounts=(await pool.query(`WITH scoped AS (
      SELECT p.kind,e.partner_id,sum(e.amount_base) balance FROM partner_entries e JOIN partners p ON p.company_id=e.company_id AND p.id=e.partner_id
      LEFT JOIN commercial_documents d ON d.company_id=e.company_id AND d.id=e.document_id LEFT JOIN payments pay ON pay.company_id=e.company_id AND pay.id=e.payment_id
      LEFT JOIN shifts s ON s.company_id=pay.company_id AND s.id=pay.shift_id LEFT JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id
      WHERE e.company_id=$1 AND e.created_at<$4 AND (d.warehouse_id=ANY($2::uuid[]) OR c.branch_id=ANY($3::uuid[]) OR (e.opening_id IS NOT NULL AND $5)) GROUP BY p.kind,e.partner_id)
      SELECT kind,count(*) accounts,COALESCE(sum(GREATEST(balance,0)),0) due_base,COALESCE(sum(GREATEST(-balance,0)),0) credit_base FROM scoped GROUP BY kind`,[req.user.companyId,req.user.warehouses,req.user.branches,values[3],req.user.roles.some(role=>role.is_admin)])).rows;
    const shifts=(await pool.query('SELECT (s.closed_at IS NOT NULL) closed,count(*) count FROM shifts s JOIN cashboxes c ON c.company_id=s.company_id AND c.id=s.cashbox_id WHERE s.company_id=$1 AND c.branch_id=ANY($2::uuid[]) AND s.opened_at>=$3 AND s.opened_at<$4 GROUP BY (s.closed_at IS NOT NULL)',[req.user.companyId,req.user.branches,values[2],values[3]])).rows;
    const daily=query.trend?[]:(await pool.query(`SELECT (created_at AT TIME ZONE 'UTC')::date::text AS "day",
      sum(CASE WHEN kind='sale' THEN total_base ELSE -total_base END) sales,
      sum((CASE WHEN kind='sale' THEN 1 ELSE -1 END)*((subtotal-discount)*exchange_rate-cost_base)) profit
      FROM commercial_documents WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[]) AND kind IN('sale','sale_return') AND created_at>=GREATEST($3::timestamptz,date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'-interval '6 days') AND created_at<$4 GROUP BY 1 ORDER BY 1`,values)).rows;
    const topProducts=(await pool.query(`SELECT l.product_id id,max(l.snapshot->>'name') name,max(l.snapshot->>'barcode') barcode,
      sum((CASE WHEN d.kind='sale' THEN 1 ELSE -1 END)*(l.snapshot->>'baseQuantity')::numeric) quantity,
      sum((CASE WHEN d.kind='sale' THEN 1 ELSE -1 END)*(l.snapshot->>'total')::numeric*d.exchange_rate) revenue,
      sum((CASE WHEN d.kind='sale' THEN 1 ELSE -1 END)*((l.snapshot->>'net')::numeric*d.exchange_rate-(l.snapshot->>'costBase')::numeric)) profit
      FROM commercial_lines l JOIN commercial_documents d ON d.company_id=l.company_id AND d.id=l.document_id
      WHERE d.company_id=$1 AND d.warehouse_id=ANY($2::uuid[]) AND d.created_at>=$3 AND d.created_at<$4 AND d.kind IN('sale','sale_return') GROUP BY l.product_id ORDER BY revenue DESC LIMIT 5`,values)).rows;
    const categorySales=(await pool.query(`SELECT COALESCE(c.name,p.category_id,'غير مصنف') name,
      sum((CASE WHEN d.kind='sale' THEN 1 ELSE -1 END)*(l.snapshot->>'total')::numeric*d.exchange_rate) amount,
      sum((CASE WHEN d.kind='sale' THEN 1 ELSE -1 END)*(l.snapshot->>'baseQuantity')::numeric) qty
      FROM commercial_lines l JOIN commercial_documents d ON d.company_id=l.company_id AND d.id=l.document_id JOIN products p ON p.company_id=l.company_id AND p.id=l.product_id LEFT JOIN categories c ON c.company_id=p.company_id AND c.id=p.category_id
      WHERE d.company_id=$1 AND d.warehouse_id=ANY($2::uuid[]) AND d.created_at>=$3 AND d.created_at<$4 AND d.kind IN('sale','sale_return') GROUP BY 1 ORDER BY amount DESC LIMIT 30`,values)).rows;
    const lowStockProducts=(await pool.query(`SELECT p.id,p.name,p.sku barcode,p.data->>'unit' unit,COALESCE(sum(s.quantity),0) stock
      FROM products p LEFT JOIN stock_balances s ON s.company_id=p.company_id AND s.product_id=p.id AND s.warehouse_id=ANY($2::uuid[])
      WHERE p.company_id=$1 AND p.type='stock' AND p.archived_at IS NULL GROUP BY p.company_id,p.id HAVING COALESCE(sum(s.quantity),0)<=10 ORDER BY stock,p.name LIMIT 30`,values.slice(0,2))).rows;
    const trend=query.trend?await dashboardTrend(pool,values):{};
    res.json({documents,stock,payments,summary,accounts,shifts,dashboard:{daily,topProducts,categorySales,lowStockProducts,...trend},baseCurrency:baseCurrency.code,decimals:baseCurrency.decimals,allocationFxBase:allocationFx,from:values[2],to:values[3]});
  });
  route('get','/products/scan/:code','catalog.read',async(req,res)=>{
    const code=z.string().regex(/^\d{13}$/).parse(req.params.code),digits=code.split('').map(Number);if((10-digits.slice(0,12).reduce((sum,value,index)=>sum+value*(index%2?3:1),0)%10)%10!==digits[12]||code[0]!=='2')fail(400,'INVALID_SCALE_BARCODE','Expected a valid weighted EAN-13 barcode');
    const warehouseId=z.string().uuid().parse(req.query.warehouseId??req.user.warehouses[0]);await requireWarehouse(pool,req.user,warehouseId);const row=(await pool.query("SELECT id FROM products WHERE company_id=$1 AND data->>'scaleCode'=$2 AND archived_at IS NULL",[req.user.companyId,code.slice(1,6)])).rows[0];if(!row)fail(404,'NOT_FOUND','Scale product not found');const product=await getProduct(pool,req.user.companyId,row.id,warehouseId),quantity=Number(code.slice(6,12))/1000;if(quantity<=0)fail(400,'INVALID_SCALE_QUANTITY','Scale quantity must be positive');let line;try{line=createProductLine(product,{qty:quantity});}catch{fail(400,'INVALID_SCALE_QUANTITY','Product unit does not accept the encoded quantity');}res.json({product,line});
  });
  route('post','/quotations','modules.advancedSales',async(req,res)=>res.status(201).json(await createOrder(pool,req.user,req.headers['idempotency-key'],req.body)),advanced);
  route('post','/orders','modules.advancedSales',async(req,res)=>res.status(201).json(await createOrder(pool,req.user,req.headers['idempotency-key'],req.body,'order')),advanced);
  route('get','/orders','modules.advancedSales',async(req,res)=>{const query=pagination.strict().parse(req.query),items=(await pool.query('SELECT id,number,kind,snapshot,created_at FROM commercial_orders WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[]) ORDER BY created_at DESC,id LIMIT $3 OFFSET $4',[req.user.companyId,req.user.warehouses,query.limit,(query.page-1)*query.limit])).rows,total=Number((await pool.query('SELECT count(*) FROM commercial_orders WHERE company_id=$1 AND warehouse_id=ANY($2::uuid[])',[req.user.companyId,req.user.warehouses])).rows[0].count);res.json({items,total,...query});},advanced);
  route('get','/orders/:id','modules.advancedSales',async(req,res)=>res.json(await getOrder(pool,req.user,req.params.id)),advanced);
  route('post','/quotations/:id/convert','modules.advancedSales',async(req,res)=>res.json(await convertQuotation(pool,req.user,req.headers['idempotency-key'],req.params.id)),advanced);
  route('post','/orders/:id/deliver','modules.advancedSales',async(req,res)=>res.json(await deliverOrder(pool,req.user,req.headers['idempotency-key'],req.params.id,req.body)),advanced);
  route('post','/orders/:id/invoice','modules.advancedSales',async(req,res)=>res.json(await invoiceOrder(pool,req.user,req.headers['idempotency-key'],req.params.id,req.body)),advanced);
  registerPrintRoutes({router,route,pool});
  return router;
}
