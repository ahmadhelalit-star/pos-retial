import { readConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
const pool=createPool(readConfig().databaseUrl);
try { console.log(JSON.stringify({applied:await migrate(pool)})); } finally { await pool.end(); }
