import {settings,privateDir,sanitize} from './common.mjs';
import {rebaseRow,rebaseTables,canonical} from './currency-rebase-lib.mjs';
import pg from '../backend/node_modules/pg/lib/index.js';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,stat,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),from=args[args.indexOf('--from')+1],to=args[args.indexOf('--to')+1],apply=args.includes('--apply'),check=args.includes('--check'),run=promisify(execFile),q=name=>{if(!/^[a-z_]+$/.test(name))throw Error('Invalid SQL identifier');return '"'+name+'"';};
const config=await settings();
if(!args.includes('--one-to-one')||!['SAR'].includes(from)||to!=='EGP'||apply===check)throw Error('Explicit --from SAR --to EGP --one-to-one and exactly one of --check/--apply required. No general FX conversion is supported.');
const pool=new pg.Pool({connectionString:config.env.DATABASE_URL,max:1}),db=await pool.connect();let inTransaction=false,oldEnv,newEnv;
try{
 if(!(await db.query("SELECT pg_try_advisory_lock(hashtext('retail:server-instance')) locked")).rows[0].locked)throw Error('Stop Retail Developer before currency maintenance');
 assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'sham_retail_dev');
 const companies=(await db.query('SELECT * FROM companies')).rows;if(companies.length!==1)throw Error('Exactly one Developer company is required');const company=companies[0];
 if(company.base_currency===to){console.log(JSON.stringify({alreadyApplied:true,baseCurrency:to}));}else{
  assert.equal(company.base_currency,from);const decimals=(await db.query('SELECT code,decimals FROM currencies WHERE code=ANY($1)',[[from,to]])).rows;
  if(decimals.find(row=>row.code===from)?.decimals!==2||decimals.some(row=>row.code===to&&row.decimals!==2))throw Error('Matching currency precision required');
  const targetRate=(await db.query('SELECT rate FROM company_currencies WHERE company_id=$1 AND code=$2',[company.id,to])).rows[0]?.rate;if(targetRate!==undefined&&Number(targetRate)!==1)throw Error('Existing EGP exchange rate conflicts with the explicitly authorized 1:1 conversion');
  const toolsRoot='C:/Program Files/PostgreSQL',versions=(await readdir(toolsRoot)).sort((a,b)=>Number(b)-Number(a)),tools=join(toolsRoot,versions[0],'bin'),folder=join(privateDir,'backups','currency-rebase-'+new Date().toISOString().replaceAll(/[:.]/g,'-'));await mkdir(folder,{recursive:true});
  const backup=join(folder,'sham_retail_dev-before-EGP.pgdump'),connectionArgs=['--host',config.url.hostname,'--port',config.url.port||'5432','--username',decodeURIComponent(config.url.username)],options={windowsHide:true,timeout:120000,maxBuffer:8*1024*1024,env:{...process.env,PGPASSWORD:decodeURIComponent(config.url.password),PGCONNECT_TIMEOUT:'10'}};
  await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');inTransaction=true;
  const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row=>row.tablename);await db.query('LOCK TABLE '+tables.map(name=>'public.'+q(name)).join(',')+' IN SHARE MODE');
  assert.equal((await db.query('SELECT base_currency FROM companies WHERE id=$1',[company.id])).rows[0].base_currency,from);
  await run(join(tools,'pg_dump.exe'),[...connectionArgs,'--format=custom','--no-owner','--no-acl','--file',backup,'sham_retail_dev'],options);await run(join(tools,'pg_restore.exe'),['--list',backup],options);
  const backupHash=createHash('sha256').update(await readFile(backup)).digest('hex');assert.ok((await stat(backup)).size>0);
  await db.query('LOCK TABLE '+tables.map(name=>'public.'+q(name)).join(',')+' IN ACCESS EXCLUSIVE MODE');
  const snapshot=async()=>{const result={};for(const table of tables)result[table]=(await db.query('SELECT to_jsonb(t) row FROM public.'+q(table)+' t')).rows.map(row=>row.row);return result;};
  const before=await snapshot(),expected=structuredClone(before),changes={},triggerStates=(await db.query("SELECT c.relname table_name,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND p.proname='reject_history_mutation'")).rows,disabled=[];
  await writeFile(join(folder,'before.json'),JSON.stringify(before),{mode:0o600,flag:'wx'});
  await db.query("INSERT INTO currencies(code,decimals) VALUES($1,2) ON CONFLICT(code) DO NOTHING",[to]);if(!expected.currencies.some(row=>row.code===to))expected.currencies.push({code:to,decimals:2});
  await db.query('INSERT INTO company_currencies(company_id,code,rate) VALUES($1,$2,1) ON CONFLICT(company_id,code) DO UPDATE SET rate=1',[company.id,to]);const cc=expected.company_currencies.find(row=>row.company_id===company.id&&row.code===to);if(cc)cc.rate=1;else expected.company_currencies.push({company_id:company.id,code:to,rate:1});
  await db.query(`CREATE FUNCTION pg_temp.rebase_currency(v jsonb,src text,dst text,parent text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql AS $f$
  DECLARE result jsonb; pair record; item jsonb; next_key text;
  BEGIN
   IF jsonb_typeof(v)='object' THEN result='{}'::jsonb;
    FOR pair IN SELECT key,value FROM jsonb_each(v) LOOP
     next_key=CASE WHEN parent IN ('expected','counted','differences') AND pair.key=src THEN dst ELSE pair.key END;
     IF next_key<>pair.key AND v ? dst THEN RAISE EXCEPTION 'Currency map collision requires review'; END IF;
     item=CASE WHEN pair.key IN ('currency','baseCurrency','base_currency','defaultCurrency') AND pair.value=to_jsonb(src) THEN to_jsonb(dst) ELSE pg_temp.rebase_currency(pair.value,src,dst,pair.key) END;
     result=result||jsonb_build_object(next_key,item);
    END LOOP; RETURN result;
   ELSIF jsonb_typeof(v)='array' THEN result='[]'::jsonb; FOR item IN SELECT value FROM jsonb_array_elements(v) LOOP result=result||jsonb_build_array(pg_temp.rebase_currency(item,src,dst)); END LOOP;RETURN result;
   ELSE RETURN v;END IF;
  END;$f$`);
  const jsonNumbers=async()=>{const result={};for(const[table,cols]of Object.entries(rebaseTables))for(const col of cols)result[table+'.'+col]=(await db.query(`SELECT n::text value FROM public.${q(table)} t CROSS JOIN LATERAL jsonb_path_query(t.${q(col)},'$.** ? (@.type() == "number")') n WHERE company_id=$1 ORDER BY n::text`,[company.id])).rows;return result;};
  const numericBefore=await jsonNumbers();
  for(const table of Object.keys(rebaseTables)){
   const rows=(await db.query('SELECT ctid::text rid,to_jsonb(t) row FROM public.'+q(table)+' t WHERE company_id=$1',[company.id])).rows;
   for(const entry of rows){const next=rebaseRow(table,entry.row,from,to);if(canonical(next)===canonical(entry.row))continue;
    if(!changes[table]){for(const trigger of triggerStates.filter(row=>row.table_name===table)){if(trigger.tgenabled!=='O')throw Error('Unexpected history trigger state');await db.query('ALTER TABLE public.'+q(table)+' DISABLE TRIGGER '+q(trigger.tgname));disabled.push(trigger);}changes[table]=0;}
    const columns=Object.keys(next).filter(key=>canonical(next[key])!==canonical(entry.row[key]));assert.ok(columns.every(key=>key==='currency'||rebaseTables[table].includes(key)));const values=[from,to,company.id,entry.rid];
    const result=await db.query('UPDATE public.'+q(table)+' SET '+columns.map(key=>q(key)+'='+(key==='currency'?'CASE WHEN currency=$1::text THEN $2::text ELSE currency END':'pg_temp.rebase_currency('+q(key)+',$1,$2)')).join(',')+' WHERE company_id=$3 AND ctid=$4::tid',values);assert.equal(result.rowCount,1);changes[table]++;
   }
   expected[table]=before[table].map(row=>row.company_id===company.id?rebaseRow(table,row,from,to):row);
  }
  await db.query('UPDATE companies SET base_currency=$2 WHERE id=$1',[company.id,to]);expected.companies=before.companies.map(row=>row.id===company.id?{...row,base_currency:to}:row);
  for(const trigger of disabled)await db.query('ALTER TABLE public.'+q(trigger.table_name)+' ENABLE TRIGGER '+q(trigger.tgname));
  const after=await snapshot(),sorted=rows=>rows.map(canonical).sort();for(const table of tables)assert.deepEqual(sorted(after[table]),sorted(expected[table]),'Unintended data change: '+table);
  assert.deepEqual(await jsonNumbers(),numericBefore,'Exact JSON numeric amounts must stay unchanged');
  assert.deepEqual((await db.query("SELECT c.relname table_name,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND p.proname='reject_history_mutation'")).rows.map(canonical).sort(),triggerStates.map(canonical).sort());
  if(before.commercial_documents.length){await db.query('SAVEPOINT history_guard');let rejected=false;try{await db.query('UPDATE commercial_documents SET currency=currency WHERE company_id=$1',[company.id]);}catch(error){if(error.code!=='23514'||error.message!=='immutable history')throw error;rejected=true;}await db.query('ROLLBACK TO SAVEPOINT history_guard');await db.query('RELEASE SAVEPOINT history_guard');assert.equal(rejected,true,'History guard must be restored');}
  const report={database:'sham_retail_dev',from,to,rate:'1:1',mode:apply?'applied':'checked-and-rolled-back',backup,sha256:backupHash,changes,recordCountsUnchanged:true,numericAmountsUnchanged:true,historyGuardsRestored:true,archivedPrintJobsUnchanged:true};
  if(apply){const admin=(await db.query('SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.company_id=$1 AND r.is_admin=true ORDER BY u.created_at LIMIT 1',[company.id])).rows[0]?.id;if(!admin)throw Error('Admin audit identity required');await db.query("INSERT INTO audit_logs(company_id,user_id,action,entity_id,details) VALUES($1,$2,'currency.rebase.one_to_one',$3,$4)",[company.id,admin,company.id,JSON.stringify({...report,backup:backup.split(/[\\/]/).pop()})]);
   oldEnv=await readFile(join(privateDir,'.env'),'utf8');const epoch='RETAIL_DATA_EPOCH='+randomUUID();newEnv=/^RETAIL_DATA_EPOCH=.*$/m.test(oldEnv)?oldEnv.replace(/^RETAIL_DATA_EPOCH=.*$/m,epoch):oldEnv.trimEnd()+'\n'+epoch+'\n';await writeFile(join(folder,'developer-env-before.txt'),oldEnv,{mode:0o600,flag:'wx'});await writeFile(join(privateDir,'.env'),newEnv,{mode:0o600});
   await db.query('COMMIT');inTransaction=false;
  }else{await db.query('ROLLBACK');inTransaction=false;const rolledBack=await snapshot();for(const table of tables)assert.deepEqual(sorted(rolledBack[table]),sorted(before[table]),'Rollback mismatch: '+table);}
  await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify(report));
 }
}catch(error){if(inTransaction){await db.query('ROLLBACK').catch(()=>{});if(oldEnv!==undefined&&newEnv!==undefined)await writeFile(join(privateDir,'.env'),oldEnv,{mode:0o600});}console.error(sanitize(error.message,config));process.exitCode=1;}finally{await db.query('SELECT pg_advisory_unlock_all()').catch(()=>{});db.release();await pool.end();}
