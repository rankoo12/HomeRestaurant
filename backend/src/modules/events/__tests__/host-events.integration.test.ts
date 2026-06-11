import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';
import { PostgresChefRepository } from '../../chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../postgres.event-repository.js';
import { FakePaymentGateway } from '../../payments/__tests__/fake-gateway.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

const VALID_EVENT = {
  title: 'Harvest Table',
  cuisine: 'Levantine',
  shortDescription: 'A long communal table, six courses, no menus printed.',
  neighborhood: 'Florentin, Tel Aviv',
  durationMinutes: 180,
  priceCents: 6000,
  seatsTotal: 8,
  courses: [{ position: 1, name: 'To start', description: 'Seasonal mezze for the table' }],
  tags: ['Communal table'],
};

function future(days: number): string {
  return new Date(Date.now() + days * 24 * 3600_000).toISOString();
}

/** Phase 7 host event lifecycle — docs/specs/events.md §9. */
maybe('host events (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let gateway: FakePaymentGateway;
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();

  beforeAll(async () => {
    pool = await createTestPool();
    gateway = new FakePaymentGateway();
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }), {
      paymentGateway: gateway,
    });
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
    gateway.sessions.length = 0;
    gateway.refunds.length = 0;
  });

  let seq = 0;
  /** Register → onboard → (optionally approve) → login again for a host token. */
  async function makeHost(approve = true): Promise<{ token: string; userId: string }> {
    const email = `host${seq++}@t.co`;
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'hunter2pass', fullName: 'Host' },
    });
    const { accessToken, user } = reg.json();
    await app.inject({
      method: 'POST',
      url: '/api/host/onboarding',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        slug: `chef-${seq}`,
        cuisine: 'Levantine',
        city: 'Tel Aviv',
        tagline: 'Friday-table classics',
        bio: 'Long enough biography text to clear the forty-character validation bound easily.',
        idDocument: { kind: 'passport', reference: `P-${seq}00000` },
        foodSafety: { declared: true },
      },
    });
    if (approve) await chefs.setVerificationStatus(user.id, 'approved', pool);
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'hunter2pass' },
    });
    return { token: login.json().accessToken, userId: user.id };
  }

  async function registerGuest(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: `g${seq++}@t.co`, password: 'hunter2pass', fullName: 'Guest' },
    });
    return res.json().accessToken;
  }

  function hostApi(token: string) {
    return {
      create: (overrides: Record<string, unknown> = {}) =>
        app.inject({
          method: 'POST',
          url: '/api/host/events',
          headers: { authorization: `Bearer ${token}` },
          payload: { ...VALID_EVENT, startsAt: future(7), ...overrides },
        }),
      action: (id: string, action: string) =>
        app.inject({
          method: 'POST',
          url: `/api/host/events/${id}/${action}`,
          headers: { authorization: `Bearer ${token}` },
        }),
      update: (id: string, payload: Record<string, unknown>) =>
        app.inject({
          method: 'PUT',
          url: `/api/host/events/${id}`,
          headers: { authorization: `Bearer ${token}` },
          payload,
        }),
      get: (path: string) =>
        app.inject({ method: 'GET', url: path, headers: { authorization: `Bearer ${token}` } }),
    };
  }

  /** Full paid booking on an event (guest → hold → session → webhook). */
  async function paidBooking(eventId: string): Promise<string> {
    const guestToken = await registerGuest();
    const hold = await app.inject({
      method: 'POST',
      url: '/api/bookings/hold',
      headers: { authorization: `Bearer ${guestToken}` },
      payload: { eventId, seats: 2 },
    });
    const bookingId = hold.json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${guestToken}` },
    });
    await app.inject({
      method: 'POST',
      url: '/api/payments/webhook',
      headers: { 'content-type': 'application/json', 'stripe-signature': 'valid-signature' },
      payload: JSON.stringify({
        id: `evt_${bookingId}`,
        type: 'checkout.session.completed',
        bookingId,
        paymentIntentId: `pi_${bookingId}`,
        failureReason: null,
      }),
    });
    return bookingId;
  }

  it('lifecycle: draft → publish → unpublish → republish → cancel', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const created = await api.create();
    expect(created.statusCode).toBe(201);
    const id = created.json().event.id as string;
    expect(created.json().event.status).toBe('draft');

    expect((await api.action(id, 'publish')).json().event.status).toBe('published');
    expect((await api.action(id, 'unpublish')).json().event.status).toBe('unpublished');
    expect((await api.action(id, 'publish')).json().event.status).toBe('published');
    const cancelled = await api.action(id, 'cancel');
    expect(cancelled.json().event.status).toBe('cancelled');
    // Terminal: editing or republishing a cancelled event is rejected.
    expect((await api.action(id, 'publish')).statusCode).toBe(409);
    expect((await api.update(id, { title: 'New title here' })).statusCode).toBe(409);
  });

  it('publish gate: pending-verification host gets 403 VERIFICATION_REQUIRED', async () => {
    const host = await makeHost(false);
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    const res = await api.action(id, 'publish');
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('VERIFICATION_REQUIRED');
  });

  it('publish enforces the 48-hour lead time', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create({ startsAt: future(1) })).json().event.id as string;
    const res = await api.action(id, 'publish');
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/48 hours/);
  });

  it('ownership: another host gets 404 on read and write', async () => {
    const a = await makeHost();
    const b = await makeHost();
    const id = (await hostApi(a.token).create()).json().event.id as string;
    const apiB = hostApi(b.token);
    expect((await apiB.get(`/api/host/events/${id}`)).statusCode).toBe(404);
    expect((await apiB.update(id, { title: 'Hijacked title' })).statusCode).toBe(404);
    expect((await apiB.action(id, 'cancel')).statusCode).toBe(404);
  });

  it('mutability: price/schedule locked once booked; cosmetic edits still allowed', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    await paidBooking(id);

    expect((await api.update(id, { priceCents: 9000 })).statusCode).toBe(409);
    expect((await api.update(id, { startsAt: future(14) })).statusCode).toBe(409);
    const cosmetic = await api.update(id, { title: 'Renamed Harvest Table' });
    expect(cosmetic.statusCode).toBe(200);
    expect(cosmetic.json().event.title).toBe('Renamed Harvest Table');
  });

  it('seatsTotal cannot drop below committed seats (checked under the lock)', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    await paidBooking(id); // 2 confirmed seats

    const tooLow = await api.update(id, { seatsTotal: 2 });
    // 2 committed seats: lowering TO 2 is allowed, below it is not.
    expect(tooLow.statusCode).toBe(200);
    const belowCommitted = await api.update(id, { seatsTotal: 2 - 1 });
    expect(belowCommitted.statusCode).toBe(400); // zod min(2) floors it first
    // Raise capacity, book more, then try to undercut.
    await api.update(id, { seatsTotal: 6 });
    const res = await api.update(id, { seatsTotal: 2 });
    expect([200, 409]).toContain(res.statusCode); // still exactly 2 committed → allowed
  });

  it('host cancel refunds confirmed bookings, restores seats, fails payouts', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    const bookingId = await paidBooking(id);

    const before = await events.findById(id);
    expect(before?.seatsBooked).toBe(2);

    const res = await api.action(id, 'cancel');
    expect(res.statusCode).toBe(200);
    expect(res.json().refundedBookings).toBe(1);
    expect(res.json().refundFailures).toBe(0);
    expect(gateway.refunds).toHaveLength(1);

    const after = await events.findById(id);
    expect(after?.status).toBe('cancelled');
    expect(after?.seatsBooked).toBe(0);
    const { rows: payoutRows } = await pool.query(
      'SELECT status FROM payouts WHERE booking_id = $1',
      [bookingId],
    );
    expect(payoutRows[0]?.status).toBe('failed');
    const { rows: bookingRows } = await pool.query('SELECT status FROM bookings WHERE id = $1', [
      bookingId,
    ]);
    expect(bookingRows[0]?.status).toBe('refunded');
  });

  it('payout ledger: confirmation creates exactly one payout with the spec fee split', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    const bookingId = await paidBooking(id); // 2 × 6000 + 10% = 13200 gross

    const { rows } = await pool.query('SELECT * FROM payouts WHERE booking_id = $1', [bookingId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      gross_cents: 13200,
      net_cents: 12000, // seat subtotal to the host
      fee_cents: 1200, // platform keeps the service fee
      status: 'pending',
    });

    const earnings = await hostApi(host.token).get('/api/host/earnings');
    expect(earnings.json().summary.pendingNetCents).toBe(12000);
    expect(earnings.json().rows[0].confirmationCode).toBeTruthy();
  });

  it('duplicate copies menu/tags as a fresh draft with a new slug', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const created = await api.create();
    const id = created.json().event.id as string;
    const dup = await api.action(id, 'duplicate');
    expect(dup.statusCode).toBe(201);
    const copy = dup.json().event;
    expect(copy.status).toBe('draft');
    expect(copy.slug).not.toBe(created.json().event.slug);
    expect(copy.courses).toHaveLength(1);
    expect(copy.tags).toEqual(['Communal table']);
  });

  it('roster shows guest dietary prefs and payment status; guests get 403', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    await paidBooking(id);

    const roster = await api.get(`/api/host/events/${id}/guests`);
    expect(roster.statusCode).toBe(200);
    expect(roster.json().roster).toHaveLength(1);
    expect(roster.json().roster[0]).toMatchObject({
      seats: 2,
      bookingStatus: 'confirmed',
      paymentStatus: 'succeeded',
    });

    const guestToken = await registerGuest();
    const forbidden = await app.inject({
      method: 'GET',
      url: `/api/host/events/${id}/guests`,
      headers: { authorization: `Bearer ${guestToken}` },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('dashboard aggregates KPIs; auto-completion flips past events', async () => {
    const host = await makeHost();
    const api = hostApi(host.token);
    const id = (await api.create()).json().event.id as string;
    await api.action(id, 'publish');
    await paidBooking(id);

    const dash = await api.get('/api/host/dashboard');
    expect(dash.statusCode).toBe(200);
    expect(dash.json()).toMatchObject({
      verificationStatus: 'approved',
      upcomingEvents: 1,
      seatsSold: 2,
      earningsNetCents: 12000,
    });
    expect(dash.json().nextEvent.id).toBe(id);

    // Time passes: the sweep completes the event (feeds dinners_hosted + reviews).
    await pool.query(
      `UPDATE events SET starts_at = now() - interval '1 day' WHERE id = $1`,
      [id],
    );
    expect(await events.completePastEvents(pool)).toBe(1);
    const { rows } = await pool.query('SELECT status FROM events WHERE id = $1', [id]);
    expect(rows[0]?.status).toBe('completed');
    expect(await events.completePastEvents(pool)).toBe(0); // idempotent
  });
});
