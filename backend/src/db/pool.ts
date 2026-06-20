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

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Resilience against stale/dropped connections (Docker/WSL networking can
    // silently kill idle sockets). TCP keepalive detects dead peers; a short
    // idle timeout recycles connections before they rot; a finite connect
    // timeout fails fast instead of hanging ~30s on a dead socket.
    keepAlive: true,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    max: 10,
  });

  // An idle client erroring must not crash the process — pg drops it from the
  // pool and the next query gets a fresh connection. Without this handler the
  // 'error' event is unhandled and takes the server down.
  pool.on('error', (err) => {
    console.error('Idle Postgres client error (connection recycled):', err.message);
  });

  return pool;
}

/** Close the pool (tests, graceful shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
