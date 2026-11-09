import { createHash } from 'node:crypto';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { resolve,join } from 'node:path';

export function readConfig(env = process.env) {
  const source = z.object({
    DATABASE_URL: z.string().url(), HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1024).max(65535).default(37941),
    WEB_ORIGIN: z.string().url().default('http://127.0.0.1:5188'),
    NODE_ENV: z.enum(['development','test','production']).default('development'),
    SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    COOKIE_SECURE: z.enum(['true','false']).default('false'),
  }).parse(env);
  if (source.NODE_ENV === 'production') throw new Error('Retail commercial testing is not approved for production; deployment and hardware acceptance remain required.');
  const database = new URL(source.DATABASE_URL);
  // A deliberately named, loopback-only Developer profile may use the user's existing database.
  const developerDatabase = source.NODE_ENV === 'development' && env.RETAIL_DEVELOPER_MODE === 'true'
    && database.pathname === '/sham_retail_dev' && source.HOST === '127.0.0.1'
    && new URL(source.WEB_ORIGIN).hostname === '127.0.0.1';
  if (!database.pathname.startsWith('/sham_touch_retail_') && !developerDatabase) throw new Error('Dedicated Retail database required; sham_retail_dev is allowed only in the explicit local Developer profile.');
  const tlsPfx=env.RETAIL_TLS_PFX,lan=!['127.0.0.1','localhost','::1'].includes(source.HOST);
  if(lan&&(!tlsPfx||!source.WEB_ORIGIN.startsWith('https://')||source.COOKIE_SECURE!=='true'))throw Error('LAN hosting requires TLS, HTTPS origin and secure cookies');
  return { developerPrintingDirectory:developerDatabase?join(resolve(env.RETAIL_RUNTIME_DIR??'runtime'),'printing'):undefined, dataEpoch:env.RETAIL_DATA_EPOCH??createHash('sha256').update(database.pathname).digest('hex'),databaseUrl: source.DATABASE_URL, host: source.HOST, port: source.PORT, origin: new URL(source.WEB_ORIGIN).origin, sessionHours: source.SESSION_HOURS, secureCookie: source.COOKIE_SECURE === 'true',activationPublicKeyPath:env.RETAIL_ACTIVATION_PUBLIC_KEY??fileURLToPath(new URL('./resources/retail-public-key.pem',import.meta.url)),activationIntegrityPath:join(resolve(env.RETAIL_RUNTIME_DIR??'runtime'),'activation-integrity.key'),tlsPfx,tlsPassphrase:env.RETAIL_TLS_PASSWORD,frontendDirectory:env.RETAIL_FRONTEND_DIR?resolve(env.RETAIL_FRONTEND_DIR):undefined,operations:env.RETAIL_OPERATIONS_DIR?{stateDirectory:resolve(env.RETAIL_OPERATIONS_DIR),toolsDirectory:resolve(env.RETAIL_PG_TOOLS),directory:resolve(env.RETAIL_BACKUP_DIR),companyId:env.RETAIL_COMPANY_ID,maintenanceConnection:env.RETAIL_MAINTENANCE_URL}:undefined };
}
