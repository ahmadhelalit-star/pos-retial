import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transaction } from './pool.js';

export async function migrate(pool) {
  return transaction(pool, async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('retail:migrations'))");
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const folder = new URL('./migrations/', import.meta.url);
    const files = (await readdir(folder)).filter((name) => /^\d{3}_.+\.sql$/.test(name)).sort();
    const applied = [];
    for (const file of files) {
      const sql = (await readFile(new URL(file, folder), 'utf8')).replace(/\r\n/g, '\n');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = (await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [file])).rows[0];
      if (previous) { if (previous.checksum !== checksum) throw new Error(`Migration checksum changed: ${file}`); continue; }
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [file, checksum]);
      applied.push(file);
    }
    return applied;
  });
}
