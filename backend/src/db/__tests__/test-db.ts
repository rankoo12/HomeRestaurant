import pg from 'pg';
import { runMigrations } from '../migrate.js';

/**
 * Shared integration-test database helper.
 *
 * Connects to TEST_DATABASE_URL, ensures the schema is migrated, and exposes a
 * pool + a truncate() for per-test isolation. Skips gracefully (returns null)
 * when TEST_DATABASE_URL is unset so the suite can be a no-op in environments
 * without a database.
 */
const TEST_TABLES = [
  'users',
  'chef_profiles',
  'chef_badges',
  'chef_verifications',
  'events',
  'event_courses',
  'event_tags',
  'bookings',
  'seat_holds',
  'payments',
  'payouts',
  'reviews',
  'stripe_webhook_events',
];

export function testDatabaseUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL;
}

export async function createTestPool(): Promise<pg.Pool> {
  const url = testDatabaseUrl();
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: url });
  await runMigrations(pool);
  return pool;
}

export async function truncateAll(pool: pg.Pool): Promise<void> {
  await pool.query(`TRUNCATE ${TEST_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
