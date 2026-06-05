import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

/**
 * Forward-only migration runner.
 *
 * - Ensures a `schema_migrations` ledger exists.
 * - Reads `migrations/*.sql` in filename order.
 * - Runs each not-yet-applied file inside its own transaction, then records it.
 *
 * Idempotent: re-running applies only new files. A failing migration rolls back
 * and aborts the run (later migrations are not attempted).
 */
export async function runMigrations(pool: pg.Pool): Promise<MigrationResult> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));

  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  for (const file of files) {
    if (done.has(file)) {
      alreadyApplied.push(file);
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw new Error(`Migration failed: ${file}\n${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  return { applied, alreadyApplied };
}
