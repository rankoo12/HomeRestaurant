// Load .env so integration tests see TEST_DATABASE_URL, then point the default
// DATABASE_URL (used by getPool()) at the test database. This guarantees that
// repository calls made WITHOUT an explicit Queryable still hit the test DB —
// not the dev DB — so reads and writes never diverge.
import { config } from 'dotenv';
config();

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
