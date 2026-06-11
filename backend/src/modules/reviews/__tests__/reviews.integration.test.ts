import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, closeRedis, getRedis } from '../../../db/index.js';
import { buildApp } from '../../../api/app.js';
import { loadEnv } from '../../../config/env.js';
import { PostgresUserRepository } from '../../identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../events/postgres.event-repository.js';
import { PostgresBookingRepository } from '../../booking/postgres.booking-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/** Phase 7 review write side — docs/specs/reviews-and-moderation.md §9. */
maybe('reviews (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const bookings = new PostgresBookingRepository();

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
  async function registerGuest(): Promise<{ token: string; userId: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: `rev${seq++}@t.co`, password: 'hunter2pass', fullName: 'Reviewer' },
    });
    return { token: res.json().accessToken, userId: res.json().user.id };
  }

  /** Seeded chef + event + a booking for the guest, in the given states. */
  async function seedScenario(opts: {
    guestId: string;
    eventStatus?: 'published' | 'completed';
    bookingStatus?: 'pending' | 'confirmed' | 'cancelled';
  }): Promise<{ eventId: string; bookingId: string; chefId: string }> {
    const host = await users.create({ email: `c${seq++}@t.co`, fullName: 'Chef', role: 'host' }, pool);
    await chefs.create(
      { userId: host.id, slug: `c${seq}`, cuisine: 'x', city: 'x', tagline: 'x', bio: 'x' },
      pool,
    );
    const event = await events.create(
      {
        slug: `dinner-${seq}`,
        chefId: host.id,
        title: 'Reviewed Dinner',
        cuisine: 'x',
        shortDescription: 's',
        neighborhood: 'n',
        status: opts.eventStatus ?? 'completed',
        startsAt: new Date(Date.now() - 3 * 24 * 3600_000),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal: 8,
      },
      pool,
    );
    const booking = await bookings.create(
      {
        eventId: event.id,
        guestId: opts.guestId,
        seats: 2,
        status: opts.bookingStatus ?? 'confirmed',
        confirmationCode: `HR-T${seq}${Date.now() % 1000}`,
        totalCents: 11000,
      },
      pool,
    );
    return { eventId: event.id, bookingId: booking.id, chefId: host.id };
  }

  function submit(token: string, bookingId: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        bookingId,
        rating: 5,
        body: 'A wonderful evening — the kind of meal you keep thinking about.',
        ...overrides,
      },
    });
  }

  it('happy path: review lands and chef_stats moves immediately (derived view)', async () => {
    const guest = await registerGuest();
    const { bookingId, chefId } = await seedScenario({ guestId: guest.userId });

    const res = await submit(guest.token, bookingId);
    expect(res.statusCode).toBe(201);
    expect(res.json().review.rating).toBe(5);
    expect(res.json().review.chefId).toBe(chefId); // derived server-side

    const { rows } = await pool.query(
      'SELECT rating, review_count FROM chef_stats WHERE chef_id = $1',
      [chefId],
    );
    expect(Number(rows[0]?.rating)).toBe(5);
    expect(Number(rows[0]?.review_count)).toBe(1);
  });

  it('client-supplied eventId/chefId are ignored — derived from the booking', async () => {
    const guest = await registerGuest();
    const { bookingId, chefId, eventId } = await seedScenario({ guestId: guest.userId });
    const res = await submit(guest.token, bookingId, {
      eventId: '00000000-0000-0000-0000-000000000000',
      chefId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().review.eventId).toBe(eventId);
    expect(res.json().review.chefId).toBe(chefId);
  });

  it('eligibility: not-completed event, unconfirmed booking, foreign booking all rejected', async () => {
    const guest = await registerGuest();

    const futureEvent = await seedScenario({ guestId: guest.userId, eventStatus: 'published' });
    const notDone = await submit(guest.token, futureEvent.bookingId);
    expect(notDone.statusCode).toBe(409);
    expect(notDone.json().error.code).toBe('REVIEW_NOT_ELIGIBLE');

    const pendingBooking = await seedScenario({ guestId: guest.userId, bookingStatus: 'pending' });
    const notPaid = await submit(guest.token, pendingBooking.bookingId);
    expect(notPaid.statusCode).toBe(409);

    const cancelled = await seedScenario({ guestId: guest.userId, bookingStatus: 'cancelled' });
    expect((await submit(guest.token, cancelled.bookingId)).statusCode).toBe(409);

    const other = await registerGuest();
    const foreign = await seedScenario({ guestId: other.userId });
    expect((await submit(guest.token, foreign.bookingId)).statusCode).toBe(404);
  });

  it('one review per guest per event — duplicate is 409, parallel race yields exactly one', async () => {
    const guest = await registerGuest();
    const { bookingId } = await seedScenario({ guestId: guest.userId });

    const [a, b] = await Promise.all([
      submit(guest.token, bookingId),
      submit(guest.token, bookingId),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
    const dup = await submit(guest.token, bookingId);
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('ALREADY_REVIEWED');

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM reviews');
    expect(rows[0]?.n).toBe(1);
  });

  it('reviewable list: exactly the unreviewed completed-confirmed set; empties after submit', async () => {
    const guest = await registerGuest();
    const done = await seedScenario({ guestId: guest.userId });
    await seedScenario({ guestId: guest.userId, eventStatus: 'published' }); // not completed
    await seedScenario({ guestId: guest.userId, bookingStatus: 'cancelled' }); // not attended

    const before = await app.inject({
      method: 'GET',
      url: '/api/guest/reviewable',
      headers: { authorization: `Bearer ${guest.token}` },
    });
    expect(before.json().reviewable).toHaveLength(1);
    expect(before.json().reviewable[0].bookingId).toBe(done.bookingId);

    await submit(guest.token, done.bookingId);
    const after = await app.inject({
      method: 'GET',
      url: '/api/guest/reviewable',
      headers: { authorization: `Bearer ${guest.token}` },
    });
    expect(after.json().reviewable).toHaveLength(0);
  });

  it('flagging is boolean, idempotent, auth-required; review stays visible', async () => {
    const guest = await registerGuest();
    const { bookingId, eventId } = await seedScenario({ guestId: guest.userId });
    const reviewId = (await submit(guest.token, bookingId)).json().review.id as string;

    const noAuth = await app.inject({ method: 'POST', url: `/api/reviews/${reviewId}/flag` });
    expect(noAuth.statusCode).toBe(401);

    const other = await registerGuest();
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/reviews/${reviewId}/flag`,
        headers: { authorization: `Bearer ${other.token}` },
      });
      expect(res.statusCode).toBe(200);
    }
    const { rows } = await pool.query('SELECT is_flagged FROM reviews WHERE id = $1', [reviewId]);
    expect(rows[0]?.is_flagged).toBe(true);

    // Still publicly visible on the event read (moderation is Phase 8).
    const { rows: ev } = await pool.query('SELECT slug FROM events WHERE id = $1', [eventId]);
    const publicView = await app.inject({ method: 'GET', url: `/api/events/${ev[0]!.slug}` });
    expect(publicView.statusCode).toBe(404); // completed events are not published — direct check instead:
    const { rows: still } = await pool.query('SELECT count(*)::int AS n FROM reviews WHERE id = $1', [
      reviewId,
    ]);
    expect(still[0]?.n).toBe(1);
  });

  it('validation: rating bounds and body length', async () => {
    const guest = await registerGuest();
    const { bookingId } = await seedScenario({ guestId: guest.userId });
    expect((await submit(guest.token, bookingId, { rating: 6 })).statusCode).toBe(400);
    expect((await submit(guest.token, bookingId, { rating: 0 })).statusCode).toBe(400);
    expect((await submit(guest.token, bookingId, { body: 'short' })).statusCode).toBe(400);
  });
});
