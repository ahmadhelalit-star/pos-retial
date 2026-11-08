import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from '../http/errors.js';
import { hash,audit } from './common.js';
import { D,companyCurrency } from './money.js';
const collections=['customers','suppliers','invoices','purchaseInvoices','returns','payments','shifts','settings'];
const schema=z.object({data:z.record(z.string(),z.unknown()),mode:z.enum(['archive','cutover']).default('archive'),cutoverAt:z.iso.datetime().optional(),acknowledgeReconciliation:z.boolean().default(false)}).strict();
export async function previewLegacy(db,user,input){
  const body=schema.parse(input),errors=[],warnings=[],records=[],ids=new Map(),contacts=[];
  for(const collection of Object.keys(body.data))if(!collections.includes(collection))errors.push({collection,message:'Unknown collection; migrate products separately'});
  for(const collection of collections){let rows=body.data[collection];if(rows===undefined)continue;if(collection==='settings'&&!Array.isArray(rows))rows=[{...rows,id:'settings'}];if(!Array.isArray(rows)){errors.push({collection,message:'Expected array'});continue;}if(rows.length>10000)errors.push({collection,message:'Maximum 10000 records per collection'});
    const seen=new Set();ids.set(collection,seen);
    for(const [index,row] of rows.entries()){
      if(!row||row.id===undefined){errors.push({collection,index,message:'Stable legacy id required'});continue;}const id=String(row.id);if(seen.has(id)){errors.push({collection,index,message:'Duplicate id'});continue;}seen.add(id);records.push({collection,id,payload:row});
      if((await db.query('SELECT 1 FROM legacy_commercial_records WHERE company_id=$1 AND collection=$2 AND legacy_id=$3',[user.companyId,collection,id])).rowCount)errors.push({collection,index,message:'Record already archived in another batch'});
      if(['customers','suppliers'].includes(collection)){try{if(!row.name?.trim()||!D(row.balance??0).isFinite())throw new Error('Invalid account name or balance');contacts.push({id,kind:collection==='customers'?'customer':'supplier',row});}catch{errors.push({collection,index,message:'Invalid account name or balance'});}}
    }
  }
  for(const record of records){if(record.collection==='invoices'&&record.payload.customer?.id&&record.payload.customer.id!=='walk-in'&&!ids.get('customers')?.has(String(record.payload.customer.id)))errors.push({collection:record.collection,id:record.id,message:'Customer relation is missing from this copy'});if(record.collection==='purchaseInvoices'&&record.payload.supplierId&&!ids.get('suppliers')?.has(String(record.payload.supplierId)))errors.push({collection:record.collection,id:record.id,message:'Supplier relation is missing from this copy'});if(['invoices','purchaseInvoices'].includes(record.collection)&&(!Array.isArray(record.payload.items)||!Number.isFinite(Number(record.payload.grandTotal))))errors.push({collection:record.collection,id:record.id,message:'Invoice lines and total are required'});}
  if(body.mode==='cutover'){
    if(!body.cutoverAt||!body.acknowledgeReconciliation)errors.push({message:'Cutover requires an explicit effective date and reconciliation acknowledgement'});
    if(new Set(contacts.map(row=>row.id)).size!==contacts.length)errors.push({message:'Customer and supplier IDs collide; supply an explicit ID mapping before cutover'});
    for(const contact of contacts)if((await db.query('SELECT 1 FROM partners WHERE company_id=$1 AND id=$2',[user.companyId,contact.id])).rowCount)errors.push({id:contact.id,message:'Account already exists; do not overwrite its balance'});
  }
  warnings.push('Historical invoices, payments, returns and shifts are retained as a read-only archive, not reposted as new sales or inventory. Historical costs, FX and allocations missing from legacy data must not be invented.');
  if(body.mode==='cutover')warnings.push('Only approved contact opening balances enter operational receivables. Archived invoice allocation is not automatically reconstructed. Stock is never replayed by this importer.');
  return {valid:errors.length===0,count:records.length,counts:Object.fromEntries([...ids].map(([key,value])=>[key,value.size])),errors,warnings,contentHash:hash(JSON.stringify(body)),records,contacts,body};
}
export async function commitLegacy(pool,user,input){return transaction(pool,async db=>{
  const body=schema.parse(input),contentHash=hash(JSON.stringify(body));await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`legacy:${user.companyId}`]);const previous=(await db.query('SELECT report FROM legacy_commercial_batches WHERE company_id=$1 AND content_hash=$2',[user.companyId,contentHash])).rows[0];if(previous)return {...previous.report,replayed:true};
  const preview=await previewLegacy(db,user,body);if(!preview.valid)fail(422,'LEGACY_IMPORT_INVALID','No changes applied',preview.errors);const id=randomUUID(),report={id,count:preview.count,counts:preview.counts,mode:body.mode,warnings:preview.warnings,replayed:false};await db.query('INSERT INTO legacy_commercial_batches(company_id,id,content_hash,original_data,report) VALUES($1,$2,$3,$4,$5)',[user.companyId,id,contentHash,body.data,report]);
  for(const record of preview.records)await db.query('INSERT INTO legacy_commercial_records VALUES($1,$2,$3,$4,$5)',[user.companyId,id,record.collection,record.id,record.payload]);
  if(body.mode==='cutover'){const base=await companyCurrency(db,user.companyId);for(const contact of preview.contacts){const value=D(contact.row.balance??0);await db.query('INSERT INTO partners(company_id,id,kind,name,credit_limit,data) VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,contact.id,contact.kind,contact.row.name,contact.row.creditLimit??0,contact.row]);if(!value.eq(0)){const opening=randomUUID();await db.query('INSERT INTO partner_openings VALUES($1,$2,$3,$4,$5,$6)',[user.companyId,opening,contact.id,id,value.toString(),body.cutoverAt]);await db.query('INSERT INTO partner_entries(id,company_id,partner_id,amount_base,currency,amount,opening_id) VALUES($1,$2,$3,$4,$5,$4,$6)',[randomUUID(),user.companyId,contact.id,value.toString(),base.code,opening]);}}}
  await audit(db,user,'legacy.import',id,report);return report;
});}
export function registerLegacyRoutes({route,pool}){
  route('post','/legacy-import/preview','imports.preview',async(req,res)=>{requireArchiveAdmin(req.user);const preview=await previewLegacy(pool,req.user,req.body);delete preview.records;delete preview.contacts;delete preview.body;res.json(preview);});
  route('post','/legacy-import/commit','imports.commit',async(req,res)=>{requireArchiveAdmin(req.user);res.status(201).json(await commitLegacy(pool,req.user,req.body));});
  route('get','/legacy-import/records','imports.preview',async(req,res)=>{requireArchiveAdmin(req.user);const query=z.object({collection:z.enum(collections),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().parse(req.query);const items=(await pool.query('SELECT legacy_id,payload FROM legacy_commercial_records WHERE company_id=$1 AND collection=$2 ORDER BY legacy_id LIMIT $3 OFFSET $4',[req.user.companyId,query.collection,query.limit,(query.page-1)*query.limit])).rows;res.json({items,...query});});
}

function requireArchiveAdmin(user){if(!user.roles.some(role=>role.is_admin))fail(403,'ARCHIVE_ADMIN_REQUIRED','Legacy records without trustworthy branch scope require an administrator');}
