import { mkdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateKeyPairSync,randomBytes } from 'node:crypto';
import { settings,privateDir,readJSON,saveJSON } from './common.mjs';
import { createPool } from '../backend/src/db/pool.js';
import { migrate } from '../backend/src/db/migrate.js';
import { validateMigrations } from '../backend/src/operations/restore.js';
import { bootstrap } from '../backend/src/modules/bootstrap.service.js';
import { createActivationService } from '../backend/src/activation/service.js';
import protocol from '../activation-bridge/retail.cjs';
const quote=value=>'"'+value.replaceAll('"','""')+'"';
export async function inspect(pool){
  const db=await pool.connect();try{
    await db.query('BEGIN READ ONLY');
    const identity=(await db.query("SELECT current_database() database,oid FROM pg_database WHERE datname=current_database()" )).rows[0];if(identity.database!=='sham_retail_dev')throw Error('Refusing another database');
    const objects=(await db.query("SELECT n.nspname schema,c.relname name,c.relkind kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('information_schema') AND n.nspname !~ '^pg_' AND c.relkind IN ('r','p','v','m','S','f') ORDER BY 1,2")).rows;
    const routines=Number((await db.query("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('information_schema') AND n.nspname !~ '^pg_'" )).rows[0].count);
    const extensions=(await db.query("SELECT extname FROM pg_extension WHERE extname<>'plpgsql' ORDER BY extname")).rows;
    const tables=[];for(const row of objects.filter(row=>['r','p'].includes(row.kind)).slice(0,100)){tables.push({...row,rows:(await db.query(`SELECT count(*) FROM ${quote(row.schema)}.${quote(row.name)}`)).rows[0].count});}
    const hasHistory=objects.some(row=>row.schema==='public'&&row.name==='schema_migrations'&&row.kind==='r');
    const migrations=hasHistory?(await db.query('SELECT name,checksum FROM public.schema_migrations ORDER BY name')).rows:[];
    let compatible=false;if(migrations.length){try{await validateMigrations(migrations);compatible=true;}catch{}}
    await db.query('COMMIT');return {...identity,empty:objects.length===0&&routines===0&&extensions.length===0,objects,tables,routines,extensions,migrations,compatible};
  }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{db.release();}
}
export async function setup(){
  const config=await settings(),pool=createPool(config.env.DATABASE_URL);try{
    const before=await inspect(pool);await saveJSON('database-inspection.json',before);
    const managed=await readJSON('setup-state.json',null);
    if(!before.empty){
      if(managed?.complete&&managed.databaseOid===before.oid&&managed.host===config.url.hostname&&managed.port===(config.url.port||'5432')&&before.compatible){console.log('Developer database already initialized; no migrations, account resets or activation changes were performed.');return;}
      throw Error('Database contains existing objects/data. Read .developer/database-inspection.json and obtain review before any changes. No migration or seed was run.');
    }
    const applied=await migrate(pool);
    const username='retail_dev_admin',password=randomBytes(24).toString('base64url')+'!aA9';
    // Persist the recovery login before bootstrap; never print it or put it in command arguments.
    await saveJSON('login.json',{username,password,usage:'Local Developer only; do not share or commit'});
    const company=await bootstrap(pool,{company:'Sham Touch Retail Developer',username,password,currency:'SAR'});
    const keyDir=join(privateDir,'activation');await mkdir(keyDir,{recursive:true});
    const keys=generateKeyPairSync('ed25519'),passphrase=randomBytes(32).toString('base64url');
    await writeFile(join(keyDir,'test-private.encrypted.pem'),keys.privateKey.export({type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase}),{flag:'wx',mode:0o600});
    await writeFile(join(keyDir,'test-public.pem'),keys.publicKey.export({type:'spki',format:'pem'}),{flag:'wx',mode:0o600});
    await saveJSON('activation/test-key-access.json',{passphrase,testOnly:true});
    const activation=await createActivationService({pool,publicKey:keys.publicKey.export({type:'spki',format:'pem'}),integrityPath:join(privateDir,'runtime','activation-integrity.key')});
    const request=await activation.request({name:'Retail Developer Test License',phone:'0000000000'});
    const issued=protocol.createRetailCode(protocol.legacy.decodeRequestCode(request.requestCode),{validityDays:365,features:{}},keys.privateKey);
    const license=await activation.activate(issued.activationCode);if(license.status!=='ACTIVE')throw Error('Official test activation did not become active');
    const state={complete:true,database:'sham_retail_dev',databaseOid:before.oid,host:config.url.hostname,port:config.url.port||'5432',companyId:company.companyId,username,applied,activation:{status:license.status,expiresAt:license.expiresAt,testOnly:true},initializedAt:new Date().toISOString()};
    await saveJSON('setup-state.json',state);console.log(JSON.stringify({database:state.database,migrations:applied.length,admin:username,credentialsFile:'.developer/login.json',activation:state.activation}));
  }finally{await pool.end();}
}
async function main(){const command=process.argv[2];if(command==='setup')return setup();if(command!=='inspect')throw Error('Use inspect or setup');const config=await settings(),pool=createPool(config.env.DATABASE_URL);try{const result=await inspect(pool);await saveJSON('database-inspection.json',result);console.log(JSON.stringify(result,null,2));}finally{await pool.end();}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.code?`Developer database operation failed (${error.code}); no connection secrets logged.`:error.message);process.exitCode=1;});
