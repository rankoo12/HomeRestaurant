import pg from 'pg';
import { loadEnv } from '../config/env.js';

const { Pool } = pg;

/**
 * Shared PostgreSQL connection pool. One pool per process.
 *
 * Money/JSON parsing note: pg returns NUMERIC as string by default, which we
 * want (we store money as integer cents, never NUMERIC, but this keeps any
 * future NUMERIC reads lossless). BIGINT (int8) is also returned as string by
 * pg to avoid precision loss — repositories cast where they expect a number.
 */
let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const env = loadEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — cannot create a database pool.');
  }

  pool = new Pool({ connectionString: env.DATABASE_URL });
  return pool;
}

/** Close the pool (tests, graceful shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
