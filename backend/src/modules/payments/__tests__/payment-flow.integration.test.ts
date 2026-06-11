import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';
import { PostgresUserRepository } from '../../identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../events/postgres.event-repository.js';
import { FakePaymentGateway } from './fake-gateway.js';
import type { VerifiedWebhookEvent } from '../interfaces.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/**
 * End-to-end Phase 6 payment flow through the API: hold → checkout session →
 * webhook → confirmation. FakePaymentGateway throughout — no Stripe keys or
 * network (docs/specs/payments.md §9–§10).
 */
maybe('payment flow (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let gateway: FakePaymentGateway;

  const users = new PostgresUserRepository();
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
    gateway.failRefund = false;
  });

  let seq = 0;
  async function registerGuest(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: `guest${seq++}@t.co`, password: 'hunter2pass', fullName: 'Guest' },
    });
    return res.json().accessToken as string;
  }

  async function seedEvent(seatsTotal = 6): Promise<string> {
    const host = await users.create({ email: `h${seq++}@t.co`, fullName: 'H', role: 'host' }, pool);
    await chefs.create(
      { userId: host.id, slug: `chef${seq}`, cuisine: 'c', city: 'c', tagline: 't', bio: 'b' },
      pool,
    );
    const event = await events.create(
      {
        slug: `dinner${seq}`,
        chefId: host.id,
        title: 'Test Dinner',
        cuisine: 'c',
        shortDescription: 's',
        neighborhood: 'n',
        status: 'published',
        startsAt: new Date(Date.now() + 7 * 24 * 3600_000),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal,
      },
      pool,
    );
    return event.id;
  }

  async function createHold(token: string, eventId: string, seats = 2) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings/hold',
      headers: { authorization: `Bearer ${token}` },
      payload: { eventId, seats },
    });
    return res;
  }

  function deliverWebhook(event: Partial<VerifiedWebhookEvent> & { id: string; type: string }) {
    return app.inject({
      method: 'POST',
      url: '/api/payments/webhook',
      headers: { 'content-type': 'application/json', 'stripe-signature': 'valid-signature' },
      payload: JSON.stringify({
        bookingId: null,
        paymentIntentId: null,
        failureReason: null,
        ...event,
      }),
    });
  }

  it('happy path: hold → session → completed webhook → booking confirmed', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(6);

    const holdRes = await createHold(token, eventId, 2);
    expect(holdRes.statusCode).toBe(201);
    const bookingId = holdRes.json().booking.id as string;
    expect(holdRes.json().booking.totalCents).toBe(11000); // 2×5000 + 10% fee

    const sessionRes = await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.json().url).toContain(bookingId);
    expect(gateway.sessions[0]?.amountCents).toBe(11000); // server-computed, never client-supplied

    const hook = await deliverWebhook({
      id: 'evt_1',
      type: 'checkout.session.completed',
      bookingId,
      paymentIntentId: 'pi_test_1',
    });
    expect(hook.statusCode).toBe(200);
    expect(hook.json().outcome).toBe('processed');

    const view = await app.inject({
      method: 'GET',
      url: `/api/bookings/${bookingId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const body = view.json();
    expect(body.booking.status).toBe('confirmed');
    expect(body.payment.status).toBe('succeeded');
    const ev = await events.findById(eventId);
    expect(ev?.seatsBooked).toBe(2);
  });

  it('repeated webhook delivery confirms exactly once (event ledger)', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(6);
    const bookingId = (await createHold(token, eventId, 2)).json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${token}` },
    });

    const payload = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      bookingId,
      paymentIntentId: 'pi_dup',
    };
    const first = await deliverWebhook(payload);
    const second = await deliverWebhook(payload);
    const third = await deliverWebhook(payload);
    expect(first.json().outcome).toBe('processed');
    expect(second.json().outcome).toBe('duplicate');
    expect(third.json().outcome).toBe('duplicate');

    const ev = await events.findById(eventId);
    expect(ev?.seatsBooked).toBe(2); // exactly once
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM stripe_webhook_events');
    expect(rows[0]?.n).toBe(1);
  });

  it('session expired: payment failed, hold released, booking cancelled, capacity restored', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(4);
    const bookingId = (await createHold(token, eventId, 3)).json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${token}` },
    });

    const hook = await deliverWebhook({ id: 'evt_exp', type: 'checkout.session.expired', bookingId });
    expect(hook.json().outcome).toBe('processed');

    const view = await app.inject({
      method: 'GET',
      url: `/api/bookings/${bookingId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(view.json().booking.status).toBe('cancelled');
    expect(view.json().payment).toMatchObject({ status: 'failed', failureReason: 'session_expired' });

    // Another guest can now take all 4 seats.
    const token2 = await registerGuest();
    expect((await createHold(token2, eventId, 4)).statusCode).toBe(201);
  });

  it('LOST-SEAT (F4): paid after hold lapsed and seats gone → cancelled + auto-refund', async () => {
    const tokenA = await registerGuest();
    const tokenB = await registerGuest();
    const eventId = await seedEvent(2);

    const bookingA = (await createHold(tokenA, eventId, 2)).json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingA}/checkout-session`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    // A's hold lapses without payment…
    await pool.query(
      `UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE booking_id = $1`,
      [bookingA],
    );
    // …B claims and pays for the seats.
    const bookingB = (await createHold(tokenB, eventId, 2)).json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingB}/checkout-session`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    await deliverWebhook({
      id: 'evt_b',
      type: 'checkout.session.completed',
      bookingId: bookingB,
      paymentIntentId: 'pi_b',
    });

    // A's late payment arrives: booking cancelled, charge auto-refunded.
    await deliverWebhook({
      id: 'evt_a_late',
      type: 'checkout.session.completed',
      bookingId: bookingA,
      paymentIntentId: 'pi_a',
    });

    const view = await app.inject({
      method: 'GET',
      url: `/api/bookings/${bookingA}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(['cancelled', 'refunded']).toContain(view.json().booking.status);
    expect(view.json().payment.status).toBe('refunded');
    expect(gateway.refunds).toContain('pi_a');
    const ev = await events.findById(eventId);
    expect(ev?.seatsBooked).toBe(2); // only B's seats
  });

  it('rejects a bad webhook signature with 400 and processes nothing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/payments/webhook',
      headers: { 'content-type': 'application/json', 'stripe-signature': 'forged' },
      payload: JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed' }),
    });
    expect(res.statusCode).toBe(400);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM stripe_webhook_events');
    expect(rows[0]?.n).toBe(0);
  });

  it('ignores webhooks for unknown bookings without throwing', async () => {
    const res = await deliverWebhook({
      id: 'evt_unknown',
      type: 'checkout.session.completed',
      bookingId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().outcome).toBe('ignored');
  });

  it('out-of-order: payment_failed after completed only annotates, expired after completed is a no-op', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(6);
    const bookingId = (await createHold(token, eventId, 1)).json().booking.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${token}` },
    });
    await deliverWebhook({
      id: 'evt_ok',
      type: 'checkout.session.completed',
      bookingId,
      paymentIntentId: 'pi_ok',
    });
    await deliverWebhook({
      id: 'evt_late_fail',
      type: 'payment_intent.payment_failed',
      bookingId,
      failureReason: 'card_declined',
    });
    await deliverWebhook({ id: 'evt_late_exp', type: 'checkout.session.expired', bookingId });

    const view = await app.inject({
      method: 'GET',
      url: `/api/bookings/${bookingId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(view.json().booking.status).toBe('confirmed'); // untouched
    expect(view.json().payment.status).toBe('succeeded');
  });

  it('checkout-session retry keeps a single payments row (no double charge setup)', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(6);
    const bookingId = (await createHold(token, eventId, 2)).json().booking.id as string;

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/bookings/${bookingId}/checkout-session`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    }
    const { rows } = await pool.query(
      'SELECT count(*)::int AS n FROM payments WHERE booking_id = $1',
      [bookingId],
    );
    expect(rows[0]?.n).toBe(1);
  });

  it('checkout-session on an expired hold is rejected (re-reserve first)', async () => {
    const token = await registerGuest();
    const eventId = await seedEvent(6);
    const bookingId = (await createHold(token, eventId, 2)).json().booking.id as string;
    await pool.query(
      `UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE booking_id = $1`,
      [bookingId],
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/bookings/${bookingId}/checkout-session`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('INVALID_BOOKING_STATE');
  });

  it('owner-only access: another user gets 404 (not 403) for a foreign booking', async () => {
    const tokenA = await registerGuest();
    const tokenB = await registerGuest();
    const eventId = await seedEvent(6);
    const bookingId = (await createHold(tokenA, eventId, 1)).json().booking.id as string;

    const res = await app.inject({
      method: 'GET',
      url: `/api/bookings/${bookingId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('API race: two users fight for the last seat — one 201, one 409 with details', async () => {
    const tokenA = await registerGuest();
    const tokenB = await registerGuest();
    const eventId = await seedEvent(1);

    const [a, b] = await Promise.all([
      createHold(tokenA, eventId, 1),
      createHold(tokenB, eventId, 1),
    ]);
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toEqual([201, 409]);
    const loser = a.statusCode === 409 ? a : b;
    expect(loser.json().error.code).toBe('INSUFFICIENT_SEATS');
    expect(loser.json().error.details).toMatchObject({ requestedSeats: 1, availableSeats: 0 });
  });
});
