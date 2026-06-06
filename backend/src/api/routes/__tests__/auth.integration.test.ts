import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../app.js';
import { loadEnv } from '../../../config/env.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/**
 * End-to-end auth flow through the Fastify app (register → me → login → refresh
 * → rotation → logout → RBAC). Hits real Postgres + Redis.
 */
maybe('auth routes (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;

  const creds = { email: 'newguest@t.co', password: 'hunter2pass', fullName: 'New Guest' };

  beforeAll(async () => {
    pool = await createTestPool();
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await closePool();
    await closeRedis();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    await getRedis().flushdb();
  });

  async function register(body: Record<string, unknown> = creds) {
    return app.inject({ method: 'POST', url: '/api/auth/register', payload: body });
  }

  it('registers a new guest and returns tokens + safe user', async () => {
    const res = await register();
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(creds.email);
    expect(body.user.role).toBe('guest');
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('rejects duplicate email with 409 EMAIL_TAKEN', async () => {
    await register();
    const res = await register();
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a weak password with 400 VALIDATION_ERROR', async () => {
    const res = await register({ ...creds, password: 'short' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the profile from /users/me with a valid access token', async () => {
    const { accessToken } = (await register()).json();
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(creds.email);
  });

  it('rejects /users/me without a token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await register();
    const ok = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: creds.email, password: creds.password },
    });
    expect(ok.statusCode).toBe(200);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: creds.email, password: 'wrongpass1' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates the refresh token and invalidates the old one', async () => {
    const { refreshToken } = (await register()).json();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    const newRefresh = refreshed.json().refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    // Reusing the old (rotated) token must fail.
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe('INVALID_REFRESH');
  });

  it('logout revokes the refresh token', async () => {
    const { refreshToken } = (await register()).json();
    const out = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });
    expect(out.statusCode).toBe(204);

    const afterLogout = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it('enforces RBAC: a guest is 403 on /host and /admin', async () => {
    const { accessToken } = (await register()).json();
    const host = await app.inject({
      method: 'GET',
      url: '/api/host/ping',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(host.statusCode).toBe(403);
    expect(host.json().error.code).toBe('FORBIDDEN');

    const admin = await app.inject({
      method: 'GET',
      url: '/api/admin/ping',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(admin.statusCode).toBe(403);
  });
});
