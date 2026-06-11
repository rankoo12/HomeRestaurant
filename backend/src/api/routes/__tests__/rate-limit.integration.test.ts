import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/**
 * Phase 8 hardening — rate limiting (docs/specs/admin.md §9/§10).
 *
 * Rate limiting is disabled under NODE_ENV=test by default (every other suite
 * runs without it); this file opts back in via RATE_LIMIT_ENABLED. loadEnv
 * caches per Jest module registry, so the override stays local to this file.
 */
maybe('rate limiting (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = await createTestPool();
    app = await buildApp(
      loadEnv({
        ...process.env,
        NODE_ENV: 'test',
        RATE_LIMIT_ENABLED: 'true',
        RATE_LIMIT_AUTH_MAX: '10',
      }),
    );
    await app.ready();
    await truncateAll(pool);
    await getRedis().flushdb();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
    await closePool();
    await closeRedis();
  });

  it('the 11th login attempt within a minute is 429 with the standard envelope', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@t.co', password: 'wrong-pass1' },
      });
      expect(res.statusCode).toBe(401); // wrong credentials, but not limited yet
    }
    const eleventh = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@t.co', password: 'wrong-pass1' },
    });
    expect(eleventh.statusCode).toBe(429);
    expect(eleventh.json().error.code).toBe('RATE_LIMITED');
    expect(typeof eleventh.json().error.message).toBe('string');
  });

  it('ordinary endpoints stay under the generous global backstop', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
