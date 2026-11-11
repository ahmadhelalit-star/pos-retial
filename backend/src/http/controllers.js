import {setBaseCurrency} from '../modules/currency-settings.service.js';
import {saveStockSettings} from '../modules/stock-settings.service.js';
import {deleteCurrency,deleteTax} from '../modules/finance-removal.service.js';
import {variantBalances} from '../modules/variant-stock.service.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { fail } from './errors.js';
import { login,requireWarehouse } from '../modules/auth.service.js';
import { saveRole,saveUser,deleteUser } from '../modules/admin.service.js';
import {loadUser} from '../modules/auth.repository.js';
import {listCategories,saveCategory,deleteCategory,moveCategory} from '../modules/categories.service.js';
import { getProduct,listProducts } from '../modules/products.repository.js';
import { saveProduct,archiveProduct } from '../modules/products.service.js';
import { postMovement } from '../modules/stock.service.js';
import { audit } from '../modules/common.js';
import { OPTIONAL_MODULES,PERMISSIONS,moduleAccess } from '../modules/registry.js';

export const pagination=z.object({page:z.coerce.number().int().min(1).max(1000000).default(1),limit:z.coerce.number().int().min(1).max(100).default(50)});
export function controllers({pool,config,licenseProvider}) {
  const warehouse=async req=>{const id=z.string().uuid().parse(req.query.warehouseId??req.user.warehouses[0]);await requireWarehouse(pool,req.user,id);return id;};
  const cookieOptions={httpOnly:true,sameSite:'strict',secure:config.secureCookie,path:'/api',maxAge:config.sessionHours*3600000};
  return {
    saveStockSettings:async(req,res)=>res.json(await saveStockSettings(pool,req.user,req.body)),
    login:async(req,res)=>{
      const input=z.union([z.object({userId:z.string().uuid(),password:z.string().min(1).max(200)}).strict(),z.object({username:z.string().trim().min(1).max(80),password:z.string().min(1).max(200)}).strict()]).parse(req.body);
      const username=input.username??(await pool.query('SELECT username FROM users WHERE id=$1 AND active',[input.userId])).rows[0]?.username??null;
      const result=await login(pool,username,input.password,req.ip,config.sessionHours);
      res.cookie('retail_session',result.token,cookieOptions).json({user:result.user,csrfToken:result.csrfToken});
    },
    me:async(req,res)=>res.json({user:req.user,csrfToken:req.csrfToken}),
    logout:async(req,res)=>{await transaction(pool,async db=>{await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.sessionHash]);await audit(db,req.user,'auth.logout',req.user.id);});res.clearCookie('retail_session',{...cookieOptions,maxAge:undefined}).json({loggedOut:true});},
    products:async(req,res)=>{
      const query=pagination.extend({q:z.string().trim().max(200).optional(),category:z.string().max(100).optional(),type:z.enum(['stock','service','nonStock']).optional(),stock:z.enum(['all','in_stock','low_stock','out_of_stock']).optional(),warehouseId:z.string().uuid().optional()}).strict().parse(req.query);
      res.json(await listProducts(pool,req.user.companyId,query,await warehouse(req)));
    },
    product:async(req,res)=>res.json(await getProduct(pool,req.user.companyId,req.params.id,await warehouse(req))),
    moveCategory:async(req,res)=>res.json(await moveCategory(pool,req.user,req.params.id,req.body)),
    categories:async(req,res)=>res.json(await listCategories(pool,req.user.companyId)),
    createCategory:async(req,res)=>res.status(201).json(await saveCategory(pool,req.user,undefined,req.body)),
    updateCategory:async(req,res)=>res.json(await saveCategory(pool,req.user,req.params.id,req.body)),
    deleteCategory:async(req,res)=>res.json(await deleteCategory(pool,req.user,req.params.id)),
    createProduct:async(req,res)=>{const {openingBalances,...product}=req.body??{};res.status(201).json(await saveProduct(pool,req.user,undefined,product,await warehouse(req),{openingBalances}));},
    returnVariants:async(req,res)=>{await warehouse(req);const row=(await pool.query('SELECT data FROM products WHERE company_id=$1 AND id=$2',[req.user.companyId,req.params.id])).rows[0];if(!row)fail(404,'NOT_FOUND','Product not found');res.json({items:(row.data.variants??[]).map(({id,values})=>({id,values}))});},
    variantBalances:async(req,res)=>res.json(await variantBalances(pool,req.user,req.params.id)),
    updateProduct:async(req,res)=>{const {variantDistribution,...product}=req.body??{};res.json(await saveProduct(pool,req.user,req.params.id,product,await warehouse(req),{variantDistribution}));},
    archiveProduct:async(req,res)=>res.json(await archiveProduct(pool,req.user,req.params.id)),
    postStock:async(req,res)=>res.status(201).json(await postMovement(pool,req.user,req.headers['idempotency-key'],req.body)),
    ledger:async(req,res)=>{
      const query=pagination.extend({warehouseId:z.string().uuid().optional(),productId:z.string().max(100).optional()}).strict().parse(req.query),warehouseId=await warehouse(req);
      const filter=query.productId?' AND product_id=$3':'';
      const values=[req.user.companyId,warehouseId,...(query.productId?[query.productId]:[])];
      const total=Number((await pool.query(`SELECT count(*) FROM stock_ledger WHERE company_id=$1 AND warehouse_id=$2${filter}`,values)).rows[0].count);
      values.push(query.limit,(query.page-1)*query.limit);
      const items=(await pool.query(`SELECT * FROM stock_ledger WHERE company_id=$1 AND warehouse_id=$2${filter} ORDER BY created_at DESC,id LIMIT $${values.length-1} OFFSET $${values.length}`,values)).rows;
      res.json({items,total,page:query.page,limit:query.limit});
    },
    users:async(req,res)=>{
      const query=pagination.extend({q:z.string().trim().max(200).default('')}).strict().parse(req.query);
      const items=(await pool.query(`SELECT u.id,u.username,u.name,u.active,u.phone,u.is_primary_admin,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'is_admin',r.is_admin)) FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.company_id=ur.company_id WHERE ur.user_id=u.id AND ur.company_id=u.company_id),'[]') roles FROM users u WHERE u.company_id=$1 AND u.deleted_at IS NULL AND ($4='' OR u.name ILIKE '%'||$4||'%' OR u.phone ILIKE '%'||$4||'%') ORDER BY lower(u.name),u.id LIMIT $2 OFFSET $3`,[req.user.companyId,query.limit,(query.page-1)*query.limit,query.q])).rows;
      res.json({items,...query,total:Number((await pool.query(`SELECT count(*) FROM users WHERE company_id=$1 AND deleted_at IS NULL AND ($2='' OR name ILIKE '%'||$2||'%' OR phone ILIKE '%'||$2||'%')`,[req.user.companyId,query.q])).rows[0].count)});
    },
    user:async(req,res)=>{
      const id=z.string().uuid().parse(req.params.id),row=(await pool.query('SELECT id,username,name,active,phone,is_primary_admin FROM users WHERE company_id=$1 AND id=$2 AND deleted_at IS NULL',[req.user.companyId,id])).rows[0];if(!row)fail(404,'NOT_FOUND','User not found');
      if(row.is_primary_admin){
        const primary=await loadUser(pool,id);
        return res.json({...row,roles:primary.roles,roleIds:primary.roles.map(role=>role.id),permissions:primary.permissions,branches:primary.branches,warehouses:primary.warehouses});
      }
      const roles=(await pool.query('SELECT r.id,r.name,r.is_admin FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.company_id=ur.company_id WHERE ur.company_id=$1 AND ur.user_id=$2',[req.user.companyId,id])).rows;
      const permissions=(await pool.query('SELECT DISTINCT rp.permission_id FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id WHERE ur.company_id=$1 AND ur.user_id=$2 ORDER BY rp.permission_id',[req.user.companyId,id])).rows.map(row=>row.permission_id);
      res.json({...row,roles,roleIds:roles.map(role=>role.id),permissions,branches:(await pool.query('SELECT branch_id FROM user_branches WHERE company_id=$1 AND user_id=$2',[req.user.companyId,id])).rows.map(row=>row.branch_id),warehouses:(await pool.query('SELECT warehouse_id FROM user_warehouses WHERE company_id=$1 AND user_id=$2',[req.user.companyId,id])).rows.map(row=>row.warehouse_id)});
    },
    saveUser:async(req,res)=>res.json(await saveUser(pool,req.user,req.params.id,req.body)),
    deleteUser:async(req,res)=>res.json(await deleteUser(pool,req.user,req.params.id)),
    roles:async(req,res)=>res.json({permissions:PERMISSIONS,items:(await pool.query("SELECT r.id,r.name,r.is_admin,COALESCE(jsonb_agg(rp.permission_id) FILTER(WHERE rp.permission_id IS NOT NULL),'[]') AS permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id WHERE r.company_id=$1 GROUP BY r.id ORDER BY r.name",[req.user.companyId])).rows}),
    saveRole:async(req,res)=>res.json(await saveRole(pool,req.user,req.params.id,req.body)),
    organization:async(req,res)=>res.json({
      company:(await pool.query('SELECT id,name,base_currency,allow_negative_stock FROM companies WHERE id=$1',[req.user.companyId])).rows[0],
      branches:(await pool.query('SELECT id,name FROM branches WHERE company_id=$1 AND id=ANY($2::uuid[])',[req.user.companyId,req.user.branches])).rows,
      warehouses:(await pool.query('SELECT id,name,branch_id FROM warehouses WHERE company_id=$1 AND id=ANY($2::uuid[]) AND branch_id=ANY($3::uuid[])',[req.user.companyId,req.user.warehouses,req.user.branches])).rows,
      ...(req.user.roles.some(role=>role.is_admin)&&req.user.permissions.some(permission=>['organization.manage','users.manage'].includes(permission))?{
        manageableWarehouses:(await pool.query('SELECT id,name,branch_id FROM warehouses WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name,id',[req.user.companyId,req.user.branches])).rows,
      }:{}),
      currencies:(await pool.query('SELECT cc.code,cc.rate,c.decimals FROM company_currencies cc JOIN currencies c ON c.code=cc.code WHERE cc.company_id=$1',[req.user.companyId])).rows,
      taxes:(await pool.query('SELECT id,name,rate,price_includes_tax FROM tax_configurations WHERE company_id=$1',[req.user.companyId])).rows,
      categories:(await pool.query('SELECT id,name FROM categories WHERE company_id=$1 ORDER BY sort_position,lower(name),id',[req.user.companyId])).rows,
    }),
    setBaseCurrency:async(req,res)=>res.json(await setBaseCurrency(pool,req.user,req.body)),
    deleteCurrency:async(req,res)=>res.json(await deleteCurrency(pool,req.user,req.params.code)),
    deleteTax:async(req,res)=>res.json(await deleteTax(pool,req.user,req.params.id)),
    configureCurrency:async(req,res)=>{
      const input=z.object({code:z.string().regex(/^[A-Z]{3}$/),rate:z.number().finite().positive().max(1e12),decimals:z.number().int().min(0).max(6).default(2)}).strict().parse(req.body);
      await transaction(pool,async db=>{const company=(await db.query('SELECT base_currency FROM companies WHERE id=$1 FOR UPDATE',[req.user.companyId])).rows[0];if(company.base_currency===input.code&&input.rate!==1)fail(400,'BASE_CURRENCY_RATE','Base currency rate must equal 1');await db.query('INSERT INTO currencies VALUES($1,$2) ON CONFLICT(code) DO NOTHING',[input.code,input.decimals]);await db.query('INSERT INTO company_currencies VALUES($1,$2,$3) ON CONFLICT(company_id,code) DO UPDATE SET rate=excluded.rate',[req.user.companyId,input.code,input.rate]);await audit(db,req.user,'currency.configure',input.code);});res.json(input);
    },
    configureTax:async(req,res)=>{
      const input=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(200),rate:z.number().finite().min(0).max(100),priceIncludesTax:z.boolean()}).strict().parse(req.body);
      await transaction(pool,async db=>{await db.query('INSERT INTO tax_configurations VALUES($1,$2,$3,$4,$5) ON CONFLICT(company_id,id) DO UPDATE SET name=excluded.name,rate=excluded.rate,price_includes_tax=excluded.price_includes_tax',[req.user.companyId,input.id,input.name,input.rate,input.priceIncludesTax]);await audit(db,req.user,'tax.configure',input.id);});res.json(input);
    },
    createWarehouse:async(req,res)=>{
      const input=z.object({branchId:z.string().uuid(),name:z.string().trim().min(1).max(200)}).strict().parse(req.body);
      if(!req.user.branches.includes(input.branchId))fail(403,'SCOPE_DENIED','Branch outside user scope');
      const id=randomUUID();await transaction(pool,async db=>{await db.query('INSERT INTO warehouses VALUES($1,$2,$3,$4)',[id,req.user.companyId,input.branchId,input.name]);await db.query('INSERT INTO user_warehouses VALUES($1,$2,$3)',[req.user.companyId,req.user.id,id]);await audit(db,req.user,'warehouse.create',id);});res.status(201).json({id,...input});
    },
    modules:async(req,res)=>{
      const license=await licenseProvider();
      const configuration=(await pool.query('SELECT module_id,enabled FROM module_configuration WHERE company_id=$1',[req.user.companyId])).rows;
      res.json({license,mode:'foundation',items:OPTIONAL_MODULES.map(id=>{const enabled=configuration.some(row=>row.module_id===id&&row.enabled);return {id,enabled,licensed:license.status==='ACTIVE'&&license.product==='retail'&&license.activated===true&&license.features?.[id]===true,permitted:req.user.permissions.includes(`modules.${id}`),available:moduleAccess(id,license,enabled,req.user.permissions)};})});
    },
    configureModule:async(req,res)=>{
      const id=z.enum(OPTIONAL_MODULES).parse(req.params.id),input=z.object({enabled:z.boolean()}).strict().parse(req.body);
      await transaction(pool,async db=>{await db.query('INSERT INTO module_configuration(company_id,module_id,enabled) VALUES($1,$2,$3) ON CONFLICT(company_id,module_id) DO UPDATE SET enabled=excluded.enabled',[req.user.companyId,id,input.enabled]);await audit(db,req.user,'module.configure',id,input);});res.json({id,...input});
    },
    moduleAccess:async(req,res)=>{
      const id=z.enum(OPTIONAL_MODULES).parse(req.params.id),license=await licenseProvider();
      const enabled=(await pool.query('SELECT enabled FROM module_configuration WHERE company_id=$1 AND module_id=$2',[req.user.companyId,id])).rows[0]?.enabled;
      if(!moduleAccess(id,license,enabled,req.user.permissions))fail(403,'MODULE_UNAVAILABLE','Trusted Retail license, enabled module and permission are required');
      res.json({id,available:true});
    },
    audit:async(req,res)=>{
      const query=pagination.strict().parse(req.query);
      res.json({items:(await pool.query('SELECT id,user_id,action,entity_id,details,created_at FROM audit_logs WHERE company_id=$1 ORDER BY id DESC LIMIT $2 OFFSET $3',[req.user.companyId,query.limit,(query.page-1)*query.limit])).rows,...query,total:Number((await pool.query('SELECT count(*) FROM audit_logs WHERE company_id=$1',[req.user.companyId])).rows[0].count)});
    },
  };
}
