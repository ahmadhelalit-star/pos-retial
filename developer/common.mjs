import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { atomicJSON } from '../backend/src/operations/files.js';
export const root=resolve(fileURLToPath(new URL('..',import.meta.url))),privateDir=join(root,'.developer');
export const pipe='\\\\.\\pipe\\ShamTouchRetailDeveloper-'+createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0,16);
export async function readJSON(name,fallback){try{return JSON.parse(await readFile(join(privateDir,name),'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
export async function saveJSON(name,value){await atomicJSON(join(privateDir,name),value);}
export async function settings(){
  let text;try{text=await readFile(join(privateDir,'.env'),'utf8');}catch{throw Error('Run npm run dev:configure and enter the PostgreSQL connection locally first.');}
  const env=parseEnv(text),url=new URL(env.DATABASE_URL),origin=new URL(env.WEB_ORIGIN);
  if(url.protocol!=='postgresql:'||url.pathname!=='/sham_retail_dev'||url.search||url.hash||!url.username||!url.password)throw Error('Developer requires an explicit PostgreSQL user/password and exactly sham_retail_dev. No database fallback is allowed.');
  if(env.HOST!=='127.0.0.1'||origin.hostname!=='127.0.0.1'||origin.protocol!=='http:'||env.NODE_ENV!=='development'||env.RETAIL_DEVELOPER_MODE!=='true')throw Error('Developer must use the explicit local-only profile.');
  const port=Number(env.PORT),uiPort=Number(origin.port);if(!Number.isInteger(port)||!Number.isInteger(uiPort)||port<1024||port>65535||uiPort<1024||uiPort>65535||port===uiPort)throw Error('Choose two different valid Developer ports.');
  return {env,url,port,uiPort,origin:origin.origin};
}
export function childEnvironment(config){
  const clean=Object.fromEntries(Object.entries(process.env).filter(([name])=>!(/^(RETAIL_|VITE_|DATABASE_URL$|NODE_ENV$|HOST$|PORT$|WEB_ORIGIN$|COOKIE_SECURE$|BOOTSTRAP_|PGPASSWORD$)/i.test(name))));
  return {...clean,DATABASE_URL:config.env.DATABASE_URL,NODE_ENV:'development',RETAIL_DEVELOPER_MODE:'true',HOST:'127.0.0.1',PORT:String(config.port),WEB_ORIGIN:config.origin,COOKIE_SECURE:'false',SESSION_HOURS:config.env.SESSION_HOURS??'8',RETAIL_RUNTIME_DIR:join(privateDir,'runtime'),...(config.env.RETAIL_DATA_EPOCH?{RETAIL_DATA_EPOCH:config.env.RETAIL_DATA_EPOCH}:{}),RETAIL_ACTIVATION_PUBLIC_KEY:join(privateDir,'activation','test-public.pem'),RETAIL_API_TARGET:`http://127.0.0.1:${config.port}`,RETAIL_VITE_CACHE:join(root,'frontend','node_modules','.vite-developer')};
}
export function sanitize(text,config){let safe=String(text).replaceAll(config.env.DATABASE_URL,'[private Developer connection]');for(const value of [config.url.password,decodeURIComponent(config.url.password)])if(value)safe=safe.replaceAll(value,'[redacted]');return safe;}
