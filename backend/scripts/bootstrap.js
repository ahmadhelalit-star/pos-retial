import { readConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { bootstrap } from '../src/modules/bootstrap.service.js';
const pool=createPool(readConfig().databaseUrl);
try { console.log(JSON.stringify(await bootstrap(pool,{company:process.env.BOOTSTRAP_COMPANY,username:process.env.BOOTSTRAP_USERNAME,password:process.env.BOOTSTRAP_PASSWORD,currency:process.env.BOOTSTRAP_CURRENCY}))); } finally { await pool.end(); }
