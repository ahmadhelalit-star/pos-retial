// Invoked only by the server installer after explicit setup input. No restaurant database is accepted.
import { readFile } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { createPool } from '../backend/src/db/pool.js';
import { migrate } from '../backend/src/db/migrate.js';
import { bootstrap } from '../backend/src/modules/bootstrap.service.js';
import { writePrivate } from './private-state.mjs';
import { grantRuntime } from '../backend/src/operations/permissions.js';
const input=JSON.parse((await readFile(process.argv[2],'utf8')).replace(/^\uFEFF/,''));
if(!/^sham_touch_retail_[a-z0-9_]+$/.test(input.database))throw Error('Independent Retail database name required');
const adminURL=new URL(input.adminConnection??'postgresql://127.0.0.1/postgres');if(!input.adminConnection){adminURL.port=String(input.pgPort);adminURL.username=input.pgUser;adminURL.password=input.pgPassword;}if(!['127.0.0.1','localhost','[::1]'].includes(adminURL.hostname))throw Error('PostgreSQL must be local to the Retail server');adminURL.pathname='/postgres';
const owner=`retail_maint_${randomUUID().replaceAll('-','')}`,runtime=`retail_app_${randomUUID().replaceAll('-','')}`,ownerPassword=randomBytes(32).toString('hex'),runtimePassword=randomBytes(32).toString('hex'),admin=createPool(adminURL.href);let pool;
try{
  const version=Number((await admin.query("SHOW server_version_num")).rows[0].server_version_num);if(version<170000||version>=180000)throw Error('This candidate requires local PostgreSQL 17');
  if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[input.database])).rowCount)throw Error('Database already exists; recover its Retail configuration instead of overwriting it');
  if(input.provisionJournal)await writePrivate(input.provisionJournal,{product:'retail-provision-recovery',database:input.database,owner,runtime,ownerPassword,runtimePassword,createdAt:new Date().toISOString()});
  await admin.query(`CREATE ROLE ${owner} LOGIN PASSWORD '${ownerPassword}' NOSUPERUSER CREATEDB NOCREATEROLE`);await admin.query(`CREATE ROLE ${runtime} LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
  await admin.query(`CREATE DATABASE ${input.database} OWNER ${owner}`);await admin.query(`REVOKE ALL ON DATABASE ${input.database} FROM PUBLIC`);await admin.query(`GRANT CONNECT ON DATABASE ${input.database} TO ${runtime}`);
  const ownerUrl=new URL(adminURL);ownerUrl.pathname='/'+input.database;ownerUrl.username=owner;ownerUrl.password=ownerPassword;pool=createPool(ownerUrl.href);await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');await migrate(pool);
  const fixture=await bootstrap(pool,{company:input.company,username:input.username,password:input.password});await grantRuntime(pool,runtime);
  const appUrl=new URL(ownerUrl);appUrl.username=runtime;appUrl.password=runtimePassword;
  process.stdout.write(JSON.stringify({databaseUrl:appUrl.href,maintenanceUrl:ownerUrl.href,companyId:fixture.companyId}));
}finally{await pool?.end();await admin.end();}
