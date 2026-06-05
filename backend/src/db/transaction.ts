import type pg from 'pg';
import { getPool } from './pool.js';

/**
 * A query-capable handle: either the pool (autocommit) or a transaction client.
 * Repositories accept this so the same method works inside or outside a tx —
 * the booking flow (Phase 6) always passes a transaction client.
 */
export type Queryable = Pick<pg.PoolClient, 'query'>;

/**
 * Run `fn` inside a single database transaction.
 *
 * BEGIN → fn(client) → COMMIT. Any thrown error triggers ROLLBACK and re-throws.
 * The client is always released. This is the only sanctioned way to mutate
 * seats/bookings (see docs/specs/data/08-constraints-and-concurrency.md and the
 * root CLAUDE.md "no seat writes outside a transaction" rule).
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
  pool: pg.Pool = getPool(),
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback failure is secondary to the original error; surface that one.
    }
    throw err;
  } finally {
    client.release();
  }
}
