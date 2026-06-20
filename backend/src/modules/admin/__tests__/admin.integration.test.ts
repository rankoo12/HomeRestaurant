import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';
import { hashPassword } from '../../identity/password.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

const PASSWORD = 'hunter2pass';

/** Phase 8 admin portal — docs/specs/admin.md §10 test plan. */
maybe('admin portal (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let seq = 0;

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

  // --- helpers ---------------------------------------------------------------

  async function login(email: string): Promise<{ token: string; refreshToken: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    return { token: res.json().accessToken, refreshToken: res.json().refreshToken };
  }

  /** Admins are seed/DB-only in this product (admin spec §6) — insert directly. */
  async function createAdmin(): Promise<{ token: string; userId: string; email: string }> {
    const email = `admin${seq++}@t.co`;
    const hash = await hashPassword(PASSWORD);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, 'admin', 'The Admin') RETURNING id`,
      [email, hash],
    );
    const { token } = await login(email);
    return { token, userId: rows[0]!.id, email };
  }

  async function registerGuest(
    fullName = 'Guest',
  ): Promise<{ token: string; userId: string; email: string }> {
    const email = `user${seq++}@t.co`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: PASSWORD, fullName },
    });
    expect(res.statusCode).toBe(201);
    return { token: res.json().accessToken, userId: res.json().user.id, email };
  }

  /** Registers a guest and submits the onboarding wizard → pending host. */
  async function applyAsHost(): Promise<{ token: string; userId: string; email: string }> {
    const guest = await registerGuest('Applicant');
    const res = await app.inject({
      method: 'POST',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${guest.token}` },
      payload: {
        slug: `chef-${seq++}`,
        cuisine: 'Levantine',
        city: 'Tel Aviv',
        tagline: 'Friday-table classics, all week',
        bio: 'Grew up cooking beside my grandmother; twenty years of feeding everyone who walks through my door. Come hungry.',
        idDocument: { kind: 'passport', reference: `P-100${seq}` },
        foodSafety: { declared: true, certificateRef: `FS-100${seq}` },
      },
    });
    expect(res.statusCode).toBe(201);
    // Fresh token so the JWT carries the host role.
    const { token } = await login(guest.email);
    return { token, userId: guest.userId, email: guest.email };
  }

  async function createDraftEvent(hostToken: string): Promise<string> {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/host/events',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: {
        title: 'Shabbat table',
        cuisine: 'Levantine',
        shortDescription: 'A long table, a short menu, and everything made from scratch.',
        neighborhood: 'Florentin',
        startsAt,
        durationMinutes: 180,
        priceCents: 4400,
        seatsTotal: 8,
        addressLine: '8 Levinsky Street, Tel Aviv',
        photos: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        ],
        courses: [{ position: 1, name: 'Mezze', description: 'Everything at once, the right way.' }],
        tags: ['vegetarian'],
      },
    });
    expect(res.statusCode).toBe(201);
    return res.json().event.id as string;
  }

  function adminGet(token: string, url: string) {
    return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  }

  function adminPost(token: string, url: string, payload?: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      ...(payload ? { payload } : {}),
    });
  }

  /** Direct review insert (the moderation queue input; flow-level tests live in the reviews suite). */
  async function insertReview(
    eventId: string,
    chefId: string,
    authorId: string,
    flagged: boolean,
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO reviews (event_id, chef_id, author_id, rating, body, is_flagged)
       VALUES ($1, $2, $3, 5, 'A wonderful, suspiciously glowing evening.', $4) RETURNING id`,
      [eventId, chefId, authorId, flagged],
    );
    return rows[0]!.id;
  }

  // --- 1. metrics + RBAC ------------------------------------------------------

  it('metrics reflect seeded state and are admin-only', async () => {
    const admin = await createAdmin();
    const host = await applyAsHost(); // 1 pending verification, 1 host
    const guest = await registerGuest();

    // Confirmed booking + succeeded payment inside the 30d window.
    const eventId = await createDraftEvent(host.token);
    const booking = await pool.query<{ id: string }>(
      `INSERT INTO bookings (event_id, guest_id, seats, status, confirmation_code, total_cents)
       VALUES ($1, $2, 2, 'confirmed', 'HR-TEST-1', 8800) RETURNING id`,
      [eventId, guest.userId],
    );
    await pool.query(
      `INSERT INTO payments (booking_id, status, amount_cents) VALUES ($1, 'succeeded', 8800)`,
      [booking.rows[0]!.id],
    );
    await insertReview(eventId, host.userId, guest.userId, true);

    const res = await adminGet(admin.token, '/api/admin/metrics');
    expect(res.statusCode).toBe(200);
    const { metrics } = res.json();
    expect(metrics.pendingVerifications).toBe(1);
    expect(metrics.flaggedReviews).toBe(1);
    expect(metrics.usersByRole).toEqual({ guest: 1, host: 1, admin: 1 });
    expect(metrics.bookingsLast30d).toBe(1);
    expect(metrics.grossRevenueCentsLast30d).toBe(8800);
    expect(metrics.upcomingPublishedEvents).toBe(0); // draft only

    // RBAC: host and guest are both 403.
    expect((await adminGet(host.token, '/api/admin/metrics')).statusCode).toBe(403);
    expect((await adminGet(guest.token, '/api/admin/metrics')).statusCode).toBe(403);
  });

  // --- 2. verification queue ---------------------------------------------------

  it('approve flips state, grants badges, stamps reviewed_by, and opens the publish gate', async () => {
    const admin = await createAdmin();
    const host = await applyAsHost();
    const eventId = await createDraftEvent(host.token);

    // Publish gate shut while pending (cross-test with events.md §4).
    const blocked = await adminPost(host.token, `/api/host/events/${eventId}/publish`);
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.code).toBe('VERIFICATION_REQUIRED');

    const queue = await adminGet(admin.token, '/api/admin/verifications');
    expect(queue.json().items).toHaveLength(1);
    expect(queue.json().items[0].chefId).toBe(host.userId);
    expect(queue.json().items[0].verifications).toHaveLength(2);

    const res = await adminPost(admin.token, `/api/admin/verifications/${host.userId}/approve`);
    expect(res.statusCode).toBe(200);
    expect(res.json().profile.verificationStatus).toBe('approved');
    expect(res.json().changed).toBe(true);

    // KYC rows stamped with the deciding admin.
    const rows = await pool.query(
      `SELECT status, reviewed_by, reviewed_at FROM chef_verifications WHERE chef_id = $1`,
      [host.userId],
    );
    for (const row of rows.rows) {
      expect(row.status).toBe('approved');
      expect(row.reviewed_by).toBe(admin.userId);
      expect(row.reviewed_at).not.toBeNull();
    }

    // Badges granted from the submitted kinds.
    const badges = await pool.query(`SELECT label FROM chef_badges WHERE chef_id = $1 ORDER BY label`, [
      host.userId,
    ]);
    expect(badges.rows.map((b) => b.label)).toEqual(['Food-safety certified', 'ID verified']);

    // Publish gate now open.
    const published = await adminPost(host.token, `/api/host/events/${eventId}/publish`);
    expect(published.statusCode).toBe(200);

    // Queue is empty; double-approve is an idempotent no-op.
    expect((await adminGet(admin.token, '/api/admin/verifications')).json().items).toHaveLength(0);
    const replay = await adminPost(admin.token, `/api/admin/verifications/${host.userId}/approve`);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().changed).toBe(false);
  });

  it('reject requires notes, stores them, and resubmission re-enters the queue at the back', async () => {
    const admin = await createAdmin();
    const hostA = await applyAsHost();
    const hostB = await applyAsHost();

    // Notes are required (4–500).
    const noNotes = await adminPost(admin.token, `/api/admin/verifications/${hostA.userId}/reject`, {
      notes: 'no',
    });
    expect(noNotes.statusCode).toBe(400);

    const res = await adminPost(admin.token, `/api/admin/verifications/${hostA.userId}/reject`, {
      notes: 'ID document unreadable — please resubmit a clearer scan.',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().profile.verificationStatus).toBe('rejected');

    // Host sees the notes via their onboarding state (banner is built on this).
    const state = await app.inject({
      method: 'GET',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${hostA.token}` },
    });
    const rejectedRows = state
      .json()
      .verifications.filter((v: { status: string }) => v.status === 'rejected');
    expect(rejectedRows.length).toBeGreaterThan(0);
    expect(rejectedRows[0].notes).toContain('unreadable');

    // Rejecting twice is an idempotent no-op.
    const replay = await adminPost(admin.token, `/api/admin/verifications/${hostA.userId}/reject`, {
      notes: 'Different notes the second time around.',
    });
    expect(replay.json().changed).toBe(false);

    // Resubmit → returns to the queue, behind B (fairness ordering).
    const resubmit = await app.inject({
      method: 'PUT',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${hostA.token}` },
      payload: {
        resubmit: {
          idDocument: { kind: 'national_id', reference: 'N-99' },
          foodSafety: { declared: true },
        },
      },
    });
    expect(resubmit.statusCode).toBe(200);

    const queue = await adminGet(admin.token, '/api/admin/verifications');
    expect(queue.json().items.map((i: { chefId: string }) => i.chefId)).toEqual([
      hostB.userId,
      hostA.userId,
    ]);
  });

  // --- 3. user management -------------------------------------------------------

  it('user directory supports search, filters, and pagination', async () => {
    const admin = await createAdmin();
    await registerGuest('Alice Levin');
    await registerGuest('Bob Aharoni');
    const host = await applyAsHost();

    const byName = await adminGet(admin.token, '/api/admin/users?q=alice');
    expect(byName.json().total).toBe(1);
    expect(byName.json().users[0].fullName).toBe('Alice Levin');
    expect(byName.json().users[0].passwordHash).toBeUndefined();

    const hosts = await adminGet(admin.token, '/api/admin/users?role=host');
    expect(hosts.json().users.map((u: { id: string }) => u.id)).toEqual([host.userId]);

    const paged = await adminGet(admin.token, '/api/admin/users?limit=2&offset=0');
    expect(paged.json().users).toHaveLength(2);
    expect(paged.json().total).toBe(4); // admin + 2 guests + host

    const suspended = await adminGet(admin.token, '/api/admin/users?suspended=true');
    expect(suspended.json().total).toBe(0);
  });

  it('suspend kills sessions, blocks login, unpublishes events; unsuspend restores login only', async () => {
    const admin = await createAdmin();
    const host = await applyAsHost();
    await adminPost(admin.token, `/api/admin/verifications/${host.userId}/approve`);
    const eventId = await createDraftEvent(host.token);
    await adminPost(host.token, `/api/host/events/${eventId}/publish`);

    const { refreshToken } = await login(host.email);

    const res = await adminPost(admin.token, `/api/admin/users/${host.userId}/suspend`);
    expect(res.statusCode).toBe(200);
    expect(res.json().user.isSuspended).toBe(true);
    expect(res.json().unpublishedEvents).toBe(1);

    // Sessions are dead: refresh → 401.
    const refresh = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(refresh.statusCode).toBe(401);

    // Login blocked with the canonical code.
    const blockedLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: host.email, password: PASSWORD },
    });
    expect(blockedLogin.statusCode).toBe(403);
    expect(blockedLogin.json().error.code).toBe('ACCOUNT_SUSPENDED');

    // Events were unpublished, not cancelled — bookings would stay valid.
    const event = await pool.query(`SELECT status FROM events WHERE id = $1`, [eventId]);
    expect(event.rows[0]!.status).toBe('unpublished');

    // Unsuspend: login works again; the event stays unpublished.
    await adminPost(admin.token, `/api/admin/users/${host.userId}/unsuspend`);
    await login(host.email);
    const after = await pool.query(`SELECT status FROM events WHERE id = $1`, [eventId]);
    expect(after.rows[0]!.status).toBe('unpublished');
  });

  it('self-protection: no self-suspend, no admin-suspend, no admin re-role', async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();

    const self = await adminPost(admin.token, `/api/admin/users/${admin.userId}/suspend`);
    expect(self.statusCode).toBe(403);

    const peer = await adminPost(admin.token, `/api/admin/users/${otherAdmin.userId}/suspend`);
    expect(peer.statusCode).toBe(403);

    const reRole = await adminPost(admin.token, `/api/admin/users/${otherAdmin.userId}/role`, {
      role: 'guest',
    });
    expect(reRole.statusCode).toBe(403);

    const selfDemote = await adminPost(admin.token, `/api/admin/users/${admin.userId}/role`, {
      role: 'guest',
    });
    expect(selfDemote.statusCode).toBe(403);
  });

  // --- 4. role change ------------------------------------------------------------

  it('role change: host⇄guest works with a profile, guest→host without one is 409, admin grant is 400', async () => {
    const admin = await createAdmin();
    const guest = await registerGuest();
    const host = await applyAsHost();

    // Guest with no chef profile cannot be promoted.
    const noProfile = await adminPost(admin.token, `/api/admin/users/${guest.userId}/role`, {
      role: 'host',
    });
    expect(noProfile.statusCode).toBe(409);
    expect(noProfile.json().error.code).toBe('INVALID_STATE');

    // Demote a host (profile is kept), then promote back — both fine.
    const demote = await adminPost(admin.token, `/api/admin/users/${host.userId}/role`, {
      role: 'guest',
    });
    expect(demote.statusCode).toBe(200);
    expect(demote.json().user.role).toBe('guest');

    const promote = await adminPost(admin.token, `/api/admin/users/${host.userId}/role`, {
      role: 'host',
    });
    expect(promote.statusCode).toBe(200);
    expect(promote.json().user.role).toBe('host');

    // Same-role change is an idempotent no-op.
    const same = await adminPost(admin.token, `/api/admin/users/${host.userId}/role`, {
      role: 'host',
    });
    expect(same.json().changed).toBe(false);

    // `admin` is not grantable via the API — schema rejects it outright.
    const grantAdmin = await adminPost(admin.token, `/api/admin/users/${guest.userId}/role`, {
      role: 'admin',
    });
    expect(grantAdmin.statusCode).toBe(400);
  });

  // --- 5. payout admin --------------------------------------------------------------

  it('mark-paid flows pending → paid (idempotent), 409 on failed, and shows on host earnings', async () => {
    const admin = await createAdmin();
    const host = await applyAsHost();
    const payout = await pool.query<{ id: string }>(
      `INSERT INTO payouts (chef_id, gross_cents, fee_cents, net_cents)
       VALUES ($1, 4400, 0, 4400) RETURNING id`,
      [host.userId],
    );
    const payoutId = payout.rows[0]!.id;

    const ledger = await adminGet(admin.token, '/api/admin/payouts?status=pending');
    expect(ledger.json().payouts).toHaveLength(1);
    expect(ledger.json().payouts[0].chefName).toBe('Applicant');

    const res = await adminPost(admin.token, `/api/admin/payouts/${payoutId}/mark-paid`);
    expect(res.statusCode).toBe(200);
    expect(res.json().payout.status).toBe('paid');
    expect(res.json().payout.paidAt).not.toBeNull();
    expect(res.json().changed).toBe(true);

    // Idempotent on paid.
    const replay = await adminPost(admin.token, `/api/admin/payouts/${payoutId}/mark-paid`);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().changed).toBe(false);

    // Host earnings reflect it.
    const earnings = await app.inject({
      method: 'GET',
      url: '/api/host/earnings',
      headers: { authorization: `Bearer ${host.token}` },
    });
    expect(earnings.json().rows[0].status).toBe('paid');
    expect(earnings.json().summary.paidNetCents).toBe(4400);

    // Failed payouts can never be marked paid.
    const failed = await pool.query<{ id: string }>(
      `INSERT INTO payouts (chef_id, gross_cents, fee_cents, net_cents, status)
       VALUES ($1, 1000, 0, 1000, 'failed') RETURNING id`,
      [host.userId],
    );
    const conflict = await adminPost(
      admin.token,
      `/api/admin/payouts/${failed.rows[0]!.id}/mark-paid`,
    );
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('INVALID_STATE');
  });

  // --- 6. moderation ------------------------------------------------------------------

  it('moderation queue lists context; dismiss keeps the review; remove deletes and chef_stats self-corrects', async () => {
    const admin = await createAdmin();
    const host = await applyAsHost();
    const guest = await registerGuest('Reviewer One');
    const other = await registerGuest('Reviewer Two');
    const eventId = await createDraftEvent(host.token);

    const flaggedId = await insertReview(eventId, host.userId, guest.userId, true);
    await insertReview(eventId, host.userId, other.userId, false); // unflagged — stays out of queue

    const queue = await adminGet(admin.token, '/api/admin/reviews/flagged');
    expect(queue.json().items).toHaveLength(1);
    const item = queue.json().items[0];
    expect(item.id).toBe(flaggedId);
    expect(item.author.name).toBe('Reviewer One');
    expect(item.chef.name).toBe('Applicant');
    expect(item.event.title).toBe('Shabbat table');

    // Dismiss: flag clears, review stays.
    const dismissed = await adminPost(admin.token, `/api/admin/reviews/${flaggedId}/dismiss-flag`);
    expect(dismissed.statusCode).toBe(200);
    expect(dismissed.json().review.isFlagged).toBe(false);
    expect((await adminGet(admin.token, '/api/admin/reviews/flagged')).json().items).toHaveLength(0);

    const statsBefore = await pool.query(
      `SELECT rating, review_count FROM chef_stats WHERE chef_id = $1`,
      [host.userId],
    );
    expect(Number(statsBefore.rows[0]!.review_count)).toBe(2);

    // Remove: hard delete; the derived view recomputes with zero extra code.
    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/admin/reviews/${flaggedId}`,
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(removed.statusCode).toBe(204);
    const statsAfter = await pool.query(
      `SELECT rating, review_count FROM chef_stats WHERE chef_id = $1`,
      [host.userId],
    );
    expect(Number(statsAfter.rows[0]!.review_count)).toBe(1);

    // Already removed → 404 (the UI refreshes the queue).
    const again = await app.inject({
      method: 'DELETE',
      url: `/api/admin/reviews/${flaggedId}`,
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(again.statusCode).toBe(404);
  });
});
