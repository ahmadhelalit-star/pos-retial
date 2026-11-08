import pg from 'pg';

export function createPool(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 15000, application_name: 'sham-touch-retail' });
  pool.on('error', (error) => console.error(JSON.stringify({ event: 'database_pool_error', code: error.code ?? 'UNKNOWN' })));
  return pool;
}
export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
