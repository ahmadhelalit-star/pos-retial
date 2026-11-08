import { randomUUID,generateKeyPairSync,randomBytes } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { bootstrap } from '../src/modules/bootstrap.service.js';
import { loadUser } from '../src/modules/auth.repository.js';
import { saveProduct } from '../src/modules/products.service.js';
import { savePartner } from '../src/modules/accounts.service.js';
import { postMovement } from '../src/modules/stock.service.js';
const connection=process.env.TEST_DATABASE_URL,url=new URL(connection);if(url.hostname!=='127.0.0.1'||!/^\/sham_touch_retail_.*test$/.test(url.pathname))throw new Error('Explicit isolated loopback test database required');
const root=resolve(process.env.TEST_ARTIFACT_DIR);await mkdir(root,{recursive:true});
const pool=createPool(connection);
try{
  await migrate(pool);const fixture=await bootstrap(pool,{company:process.env.TEST_COMPANY??'Retail Phase 3 Synthetic',username:process.env.TEST_UI_USERNAME??'phase3-ui-admin',password:process.env.TEST_UI_PASSWORD??'Retail-Phase3-UI-Only!2026'}),user=await loadUser(pool,fixture.userId);
  for(const row of [{id:'phase3-milk',name:'حليب اختبار Phase 3',price:10,costPrice:2,stock:0,barcode:'P3-MILK',category:'beverages'},{id:'phase3-service',name:'خدمة اختبار Phase 3',type:'service',price:12,costPrice:0,stock:0,barcode:'P3-SERVICE'},{id:'phase3-weight',name:'منتج موزون Phase 3',price:5,costPrice:2,stock:0,barcode:'P3-WEIGHT',scaleCode:'12345',allowFractional:true,unit:'كجم'}]){const product=await saveProduct(pool,user,undefined,row,fixture.warehouseId);if(product.type==='stock')await postMovement(pool,user,randomUUID(),{productId:product.id,warehouseId:fixture.warehouseId,unitId:'base',quantity:100,unitCost:2,kind:'opening',reference:`fixture:${product.id}`});}
  await savePartner(pool,user,'phase3-customer',{kind:'customer',name:'عميل اختبار Phase 3',creditLimit:1000});await savePartner(pool,user,'phase3-supplier',{kind:'supplier',name:'مورد اختبار Phase 3'});
  await pool.query("INSERT INTO currencies(code) VALUES('USD') ON CONFLICT DO NOTHING");await pool.query("INSERT INTO company_currencies VALUES($1,'USD',3.75)",[fixture.companyId]);
  const keys=generateKeyPairSync('ed25519'),publicKeyPath=join(root,'issuer-public.pem'),privateKeyPath=join(root,'issuer-private-fixture.encrypted.pem');
  await writeFile(publicKeyPath,keys.publicKey.export({type:'spki',format:'pem'}));await writeFile(privateKeyPath,keys.privateKey.export({type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase:'Fixture-Issuer-Only!2026'}),{mode:0o600,flag:'wx'});
  const role=`retail_app_${randomUUID().replaceAll('-','').slice(0,12)}`,password=randomBytes(24).toString('hex');
  await pool.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
  await pool.query(`GRANT CONNECT ON DATABASE ${url.pathname.slice(1)} TO ${role}`);await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);await pool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`);await pool.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
  const mutable=['companies','products','product_units','product_attributes','product_variants','variant_unit_prices','product_barcodes','categories','units_of_measure','roles','role_permissions','users','user_roles','user_branches','user_warehouses','sessions','login_attempts','module_configuration','company_currencies','currencies','tax_configurations','warehouses','retail_activation','document_counters','partners','shifts','delivery_allocations','print_jobs'];
  await pool.query(`GRANT INSERT,UPDATE,DELETE ON ${mutable.join(',')} TO ${role}`);
  const appendOnly=['audit_logs','idempotency_requests','import_batches','stock_ledger','cashboxes','commercial_orders','commercial_deliveries','commercial_documents','commercial_lines','document_cancellations','payments','payment_allocations','partner_entries','cash_entries','legacy_commercial_batches','legacy_commercial_records','partner_openings','allocation_events','shift_events'];
  await pool.query(`GRANT INSERT ON ${appendOnly.join(',')} TO ${role}`);
  // PostgreSQL row locks require UPDATE on at least one column. Immutable triggers still reject every mutation.
  for(const table of ['commercial_documents','commercial_orders','payments'])await pool.query(`GRANT UPDATE(id) ON ${table} TO ${role}`);
  const appUrl=new URL(connection);appUrl.username=role;appUrl.password=password;
  await writeFile(join(root,process.env.TEST_FIXTURE_FILE??'phase3-ui-fixture.json'),JSON.stringify({...fixture,publicKeyPath,privateKeyPath,databaseUrl:appUrl.href,adminConnection:connection},null,2),{mode:0o600});
  const limited=createPool(appUrl.href);try{await limited.query('SELECT 1 FROM products');let denied=false;try{await limited.query('UPDATE stock_balances SET quantity=999');}catch(error){denied=error.code==='42501';}if(!denied)throw new Error('Limited role must not edit balances');}finally{await limited.end();}
  console.log(JSON.stringify({prepared:true,database:url.pathname,limitedRole:role,publicKeyPath,fixtureFile:join(root,'phase3-ui-fixture.json')}));
}finally{await pool.end();}
