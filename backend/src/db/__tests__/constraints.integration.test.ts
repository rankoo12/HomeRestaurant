import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from './test-db.js';
import { withTransaction } from '../transaction.js';
import { closePool } from '../index.js';
import { PostgresUserRepository } from '../../modules/identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../modules/events/postgres.event-repository.js';
import { PostgresBookingRepository } from '../../modules/booking/postgres.booking-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/**
 * Phase 2's correctness bar: the schema rejects invalid states even when the
 * application tries to write them. See docs/specs/data/08-constraints-and-concurrency.md.
 */
maybe('schema constraints & concurrency primitives (integration)', () => {
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const bookings = new PostgresBookingRepository();

  beforeAll(async () => {
    pool = await createTestPool();
  });
  afterAll(async () => {
    await closePool();
    await pool.end();
  });
  beforeEach(async () => {
    await truncateAll(pool);
  });

  async function seedEvent(seatsTotal = 8): Promise<{ eventId: string; chefId: string }> {
    const host = await users.create({ email: 'h@t.co', fullName: 'H', role: 'host' }, pool);
    await chefs.create(
      { userId: host.id, slug: 'h', cuisine: 'c', city: 'c', tagline: 't', bio: 'b' },
      pool,
    );
    const event = await events.create(
      {
        slug: 'e',
        chefId: host.id,
        title: 'E',
        cuisine: 'c',
        shortDescription: 's',
        neighborhood: 'n',
        startsAt: new Date('2026-06-07T18:30:00Z'),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal,
      },
      pool,
    );
    return { eventId: event.id, chefId: host.id };
  }

  it('rejects seats_booked greater than seats_total (no overbooking)', async () => {
    const { eventId } = await seedEvent(8);
    await expect(
      pool.query('UPDATE events SET seats_booked = 9 WHERE id = $1', [eventId]),
    ).rejects.toThrow(/check constraint/i);
  });

  it('rejects a rating outside 1..5', async () => {
    const { eventId, chefId } = await seedEvent();
    const guest = await users.create({ email: 'g@t.co', fullName: 'G' }, pool);
    await expect(
      pool.query(
        `INSERT INTO reviews (event_id, chef_id, author_id, rating, body)
         VALUES ($1, $2, $3, 6, 'x')`,
        [eventId, chefId, guest.id],
      ),
    ).rejects.toThrow(/check constraint/i);
  });

  it('allows only one active seat hold per guest per event', async () => {
    const { eventId } = await seedEvent();
    const guest = await users.create({ email: 'g@t.co', fullName: 'G' }, pool);
    const future = new Date(Date.now() + 60_000);

    await pool.query(
      `INSERT INTO seat_holds (event_id, guest_id, seats, status, expires_at)
       VALUES ($1, $2, 2, 'active', $3)`,
      [eventId, guest.id, future],
    );

    await expect(
      pool.query(
        `INSERT INTO seat_holds (event_id, guest_id, seats, status, expires_at)
         VALUES ($1, $2, 1, 'active', $3)`,
        [eventId, guest.id, future],
      ),
    ).rejects.toThrow(/uniq_active_hold_per_guest_event|duplicate key/i);
  });

  it('allows only one active booking per guest per event', async () => {
    const { eventId } = await seedEvent();
    const guest = await users.create({ email: 'g@t.co', fullName: 'G' }, pool);

    await bookings.create(
      { eventId, guestId: guest.id, seats: 2, confirmationCode: 'HR-AAAA', totalCents: 10000 },
      pool,
    );

    await expect(
      bookings.create(
        { eventId, guestId: guest.id, seats: 1, confirmationCode: 'HR-BBBB', totalCents: 5000 },
        pool,
      ),
    ).rejects.toThrow(/uniq_active_booking_per_guest_event|duplicate key/i);
  });

  it('rolls back the whole transaction on error (no partial writes)', async () => {
    const { eventId } = await seedEvent();
    const guest = await users.create({ email: 'g@t.co', fullName: 'G' }, pool);

    await expect(
      withTransaction(async (client) => {
        await client.query(
          `INSERT INTO bookings (event_id, guest_id, seats, confirmation_code, total_cents)
           VALUES ($1, $2, 1, 'HR-ROLL', 5000)`,
          [eventId, guest.id],
        );
        // Force a failure after a successful write.
        throw new Error('boom');
      }, pool),
    ).rejects.toThrow('boom');

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM bookings');
    expect(rows[0]?.n).toBe(0);
  });
});
