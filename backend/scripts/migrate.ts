import pg from 'pg';
import { runMigrations } from '../src/db/migrate.js';
import { loadEnv } from '../src/config/env.js';

/**
 * CLI: apply pending migrations to DATABASE_URL. Run via `npm run db:migrate`.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  try {
    const { applied, alreadyApplied } = await runMigrations(pool);
    if (applied.length === 0) {
      console.log(`No pending migrations. (${alreadyApplied.length} already applied.)`);
    } else {
      console.log(`Applied ${applied.length} migration(s):`);
      for (const name of applied) console.log(`  ✓ ${name}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
