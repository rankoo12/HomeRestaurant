// Load .env so integration tests see TEST_DATABASE_URL, then point the default
// DATABASE_URL (used by getPool()) at the test database. This guarantees that
// repository calls made WITHOUT an explicit Queryable still hit the test DB —
// not the dev DB — so reads and writes never diverge.
import { config } from 'dotenv';
config();

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Auth integration tests need a JWT secret and Redis. Provide test defaults so
// they run locally and in CI without extra wiring. Uses Redis DB 1 (not 0) to
// avoid clobbering any dev data on the shared instance.
process.env.JWT_SECRET ??= 'integration-test-secret-key-1234567890';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
