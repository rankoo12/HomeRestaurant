import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';
import { PostgresChefRepository } from '../postgres.chef-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

const VALID_SUBMISSION = {
  slug: 'test-chef',
  cuisine: 'Levantine',
  city: 'Tel Aviv',
  tagline: 'Friday-table classics, all week',
  bio: 'Grew up cooking beside my grandmother; twenty years of feeding everyone who walks through my door. Come hungry.',
  idDocument: { kind: 'passport', reference: 'P-1234567' },
  foodSafety: { declared: true, certificateRef: 'FS-2026-001' },
};

/** Phase 7 onboarding flow — docs/specs/chef-onboarding-and-verification.md §9. */
maybe('host onboarding (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  const chefs = new PostgresChefRepository();

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

  let seq = 0;
  async function registerGuest(): Promise<{ token: string; userId: string; email: string; password: string }> {
    const email = `applicant${seq++}@t.co`;
    const password = 'hunter2pass';
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password, fullName: 'Applicant' },
    });
    const body = res.json();
    return { token: body.accessToken, userId: body.user.id, email, password };
  }

  async function submit(token: string, payload: Record<string, unknown> = VALID_SUBMISSION) {
    return app.inject({
      method: 'POST',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  it('submit creates profile + 2 KYC rows and upgrades the role, all in one commit', async () => {
    const { token, userId, email, password } = await registerGuest();
    const res = await submit(token);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.profile.verificationStatus).toBe('pending');
    expect(body.verifications).toHaveLength(2);
    expect(body.verifications.map((v: { kind: string }) => v.kind).sort()).toEqual([
      'food_safety_cert',
      'id_document',
    ]);
    // document_ref is metadata-only (approved scope decision) — never raw bytes.
    expect(
      body.verifications.find((v: { kind: string }) => v.kind === 'id_document').documentRef,
    ).toBe('passport:P-1234567');

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    expect(rows[0]?.role).toBe('host');

    // Fresh login carries the host role → host portal opens.
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    const hostToken = login.json().accessToken as string;
    const state = await app.inject({
      method: 'GET',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${hostToken}` },
    });
    expect(state.statusCode).toBe(200);
    expect(state.json().profile.slug).toBe('test-chef');
  });

  it('rejects a taken slug with 400 and persists nothing (transaction rollback)', async () => {
    const a = await registerGuest();
    await submit(a.token);
    const b = await registerGuest();
    const res = await submit(b.token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details?.field).toBe('slug');

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [b.userId]);
    expect(rows[0]?.role).toBe('guest'); // role flip rolled back with the profile
  });

  it('a second application is 409 PROFILE_EXISTS', async () => {
    const { token, email, password } = await registerGuest();
    await submit(token);
    // Same (now stale-role) token → route guard rejects.
    const replay = await submit(token, { ...VALID_SUBMISSION, slug: 'other-slug' });
    expect(replay.statusCode).toBe(409);
    expect(replay.json().error.code).toBe('PROFILE_EXISTS');
    // Even with a fresh host token, the service-level guard holds.
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    expect(login.json().user.role).toBe('host');
  });

  it('guests cannot read onboarding state (403); validation bounds enforced', async () => {
    const { token } = await registerGuest();
    const res = await app.inject({
      method: 'GET',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);

    const tooShortBio = await submit(token, { ...VALID_SUBMISSION, bio: 'too short' });
    expect(tooShortBio.statusCode).toBe(400);
  });

  it('client-supplied role/verification_status/is_superhost are ignored', async () => {
    const { token, userId } = await registerGuest();
    const res = await submit(token, {
      ...VALID_SUBMISSION,
      role: 'admin',
      verificationStatus: 'approved',
      isSuperhost: true,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().profile.verificationStatus).toBe('pending');
    expect(res.json().profile.isSuperhost).toBe(false);
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    expect(rows[0]?.role).toBe('host'); // host, never admin
  });

  it('a rejected host resubmits: fresh KYC rows appended, status back to pending', async () => {
    const { token, userId, email, password } = await registerGuest();
    await submit(token);
    await chefs.setVerificationStatus(userId, 'rejected', pool);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    const hostToken = login.json().accessToken as string;

    const res = await app.inject({
      method: 'PUT',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: {
        tagline: 'New tagline after feedback',
        resubmit: {
          idDocument: { kind: 'national_id', reference: 'N-7654321' },
          foodSafety: { declared: true },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.profile.verificationStatus).toBe('pending');
    expect(body.profile.tagline).toBe('New tagline after feedback');
    expect(body.verifications.length).toBe(4); // history preserved: 2 original + 2 resubmitted
  });

  it('slug-check reports availability and suggests alternatives', async () => {
    const { token } = await registerGuest();
    await submit(token);
    const taken = await app.inject({
      method: 'GET',
      url: '/api/host/onboarding/slug-check?slug=test-chef',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(taken.json().available).toBe(false);
    const free = await app.inject({
      method: 'GET',
      url: '/api/host/onboarding/slug-check?slug=totally-free',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(free.json().available).toBe(true);
  });
});
