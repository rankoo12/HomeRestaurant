import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool, withTransaction } from '../../../db/index.js';
import { AppError } from '../../../types/index.js';
import { PostgresUserRepository } from '../../identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../events/postgres.event-repository.js';
import { PostgresBookingRepository } from '../postgres.booking-repository.js';
import { PostgresSeatHoldRepository } from '../postgres.seat-hold-repository.js';
import { BookingService, computeTotalCents, generateConfirmationCode } from '../booking.service.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/**
 * The Phase 6 correctness bar: concurrency-safe seat allocation. Tests follow
 * docs/specs/booking-and-concurrency.md §10.
 */
maybe('booking service (integration)', () => {
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const bookings = new PostgresBookingRepository();
  const holds = new PostgresSeatHoldRepository();
  const service = new BookingService(events, bookings, holds, 0.1);

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

  let emailSeq = 0;
  async function seedGuest(): Promise<string> {
    const guest = await users.create({ email: `g${emailSeq++}@t.co`, fullName: 'G' }, pool);
    return guest.id;
  }

  async function seedEvent(seatsTotal = 8, priceCents = 5000): Promise<{ eventId: string; chefId: string }> {
    const host = await users.create({ email: `h${emailSeq++}@t.co`, fullName: 'H', role: 'host' }, pool);
    await chefs.create(
      { userId: host.id, slug: `h${emailSeq}`, cuisine: 'c', city: 'c', tagline: 't', bio: 'b' },
      pool,
    );
    const event = await events.create(
      {
        slug: `e${emailSeq}`,
        chefId: host.id,
        title: 'E',
        cuisine: 'c',
        shortDescription: 's',
        neighborhood: 'n',
        status: 'published',
        startsAt: new Date(Date.now() + 7 * 24 * 3600_000),
        durationMinutes: 120,
        priceCents,
        seatsTotal,
      },
      pool,
    );
    return { eventId: event.id, chefId: host.id };
  }

  async function availability(eventId: string): Promise<number> {
    return withTransaction(async (client) => {
      const ev = await events.findByIdForUpdate(eventId, client);
      const held = await holds.sumLiveHeldSeats(eventId, client);
      return ev!.seatsTotal - ev!.seatsBooked - held;
    }, pool);
  }

  it('LAST-SEAT RACE: N parallel holds for the final seat — exactly one wins', async () => {
    const { eventId } = await seedEvent(1);
    const guests = await Promise.all(Array.from({ length: 8 }, () => seedGuest()));

    const results = await Promise.allSettled(
      guests.map((guestId) => service.createHold(eventId, guestId, 1)),
    );

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(7);
    for (const r of lost) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(AppError);
      expect(((r as PromiseRejectedResult).reason as AppError).code).toBe('INSUFFICIENT_SEATS');
    }
    expect(await availability(eventId)).toBe(0);
  });

  it('an expired hold frees seats with NO sweeper having run', async () => {
    const { eventId } = await seedEvent(2);
    const g1 = await seedGuest();
    const g2 = await seedGuest();

    const first = await service.createHold(eventId, g1, 2);
    // Force-expire via SQL — deliberately no sweep.
    await pool.query('UPDATE seat_holds SET expires_at = now() - interval \'1 minute\' WHERE id = $1', [
      first.hold.id,
    ]);

    const second = await service.createHold(eventId, g2, 2); // must succeed
    expect(second.booking.status).toBe('pending');
    expect(await availability(eventId)).toBe(0);
  });

  it('hold creation is idempotent for identical seats and replaces on different seats', async () => {
    const { eventId } = await seedEvent(8);
    const guest = await seedGuest();

    const a = await service.createHold(eventId, guest, 2);
    const b = await service.createHold(eventId, guest, 2);
    expect(b.replayed).toBe(true);
    expect(b.booking.id).toBe(a.booking.id);

    const c = await service.createHold(eventId, guest, 3);
    expect(c.replayed).toBe(false);
    expect(c.booking.id).not.toBe(a.booking.id);
    // Old pair is closed out; exactly one active hold remains.
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM seat_holds WHERE guest_id = $1 AND status = 'active'`,
      [guest],
    );
    expect(rows[0]?.n).toBe(1);
    const old = await bookings.findById(a.booking.id);
    expect(old?.status).toBe('cancelled');
  });

  it('rejects seats > available with a structured 409 and same-chef alternatives', async () => {
    const { eventId, chefId } = await seedEvent(3);
    // A second event by the same chef with room — should appear as alternative.
    const alt = await events.create(
      {
        slug: 'alt-dinner',
        chefId,
        title: 'Alt',
        cuisine: 'c',
        shortDescription: 's',
        neighborhood: 'n',
        status: 'published',
        startsAt: new Date(Date.now() + 14 * 24 * 3600_000),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal: 8,
      },
      pool,
    );
    const guest = await seedGuest();

    try {
      await service.createHold(eventId, guest, 5);
      throw new Error('expected INSUFFICIENT_SEATS');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError;
      expect(e.code).toBe('INSUFFICIENT_SEATS');
      expect(e.status).toBe(409);
      expect(e.details).toMatchObject({ eventId, requestedSeats: 5, availableSeats: 3 });
      const alternatives = e.details?.alternatives as Array<{ id: string }>;
      expect(alternatives.map((a) => a.id)).toContain(alt.id);
    }
  });

  it('the host cannot book their own event (403)', async () => {
    const { eventId, chefId } = await seedEvent(4);
    await expect(service.createHold(eventId, chefId, 1)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('confirmPaid consumes the hold, increments seats exactly once, and replays as a no-op', async () => {
    const { eventId } = await seedEvent(6);
    const guest = await seedGuest();
    const { booking } = await service.createHold(eventId, guest, 2);

    const first = await withTransaction((c) => service.confirmPaid(booking.id, c), pool);
    expect(first).toBe('confirmed');
    const second = await withTransaction((c) => service.confirmPaid(booking.id, c), pool);
    expect(second).toBe('already-confirmed');

    const ev = await events.findById(eventId);
    expect(ev?.seatsBooked).toBe(2); // exactly once
    const hold = await holds.findByBookingId(booking.id);
    expect(hold?.status).toBe('consumed');
    expect((await bookings.findById(booking.id))?.status).toBe('confirmed');
  });

  it('confirmPaid after hold expiry: grace path when seats remain, lost-seat when gone', async () => {
    const { eventId } = await seedEvent(2);
    const g1 = await seedGuest();
    const g2 = await seedGuest();

    // Grace: hold lapsed but nobody claimed the seats.
    const a = await service.createHold(eventId, g1, 1);
    await pool.query(`UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      a.hold.id,
    ]);
    expect(await withTransaction((c) => service.confirmPaid(a.booking.id, c), pool)).toBe('confirmed');

    // Lost seat: hold lapsed AND the remaining capacity was claimed by another guest.
    const b = await service.createHold(eventId, g2, 1);
    await pool.query(`UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      b.hold.id,
    ]);
    const g3 = await seedGuest();
    const winner = await service.createHold(eventId, g3, 1);
    await withTransaction((c) => service.confirmPaid(winner.booking.id, c), pool);

    expect(await withTransaction((c) => service.confirmPaid(b.booking.id, c), pool)).toBe('lost-seat');
    expect((await bookings.findById(b.booking.id))?.status).toBe('cancelled');
  });

  it('cancel releases the hold, restores capacity, and is idempotent', async () => {
    const { eventId } = await seedEvent(4);
    const guest = await seedGuest();
    const { booking } = await service.createHold(eventId, guest, 3);
    expect(await availability(eventId)).toBe(1);

    const cancelled = await service.cancel(booking.id, guest, false);
    expect(cancelled.status).toBe('cancelled');
    expect(await availability(eventId)).toBe(4);

    // Replay is a no-op, not an error.
    expect((await service.cancel(booking.id, guest, false)).status).toBe('cancelled');
    // A confirmed booking cannot be cancelled here.
    const second = await service.createHold(eventId, guest, 1);
    await withTransaction((c) => service.confirmPaid(second.booking.id, c), pool);
    await expect(service.cancel(second.booking.id, guest, false)).rejects.toMatchObject({
      code: 'INVALID_BOOKING_STATE',
    });
  });

  it('sweepExpired flips only past-due holds and cancels their pending bookings', async () => {
    const { eventId } = await seedEvent(8);
    const g1 = await seedGuest();
    const g2 = await seedGuest();
    const stale = await service.createHold(eventId, g1, 2);
    const live = await service.createHold(eventId, g2, 2);
    await pool.query(`UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      stale.hold.id,
    ]);

    const swept = await holds.sweepExpired(pool);
    expect(swept).toBe(1);
    expect((await holds.findByBookingId(stale.booking.id))?.status).toBe('expired');
    expect((await bookings.findById(stale.booking.id))?.status).toBe('cancelled');
    expect((await holds.findByBookingId(live.booking.id))?.status).toBe('active');
    expect((await bookings.findById(live.booking.id))?.status).toBe('pending');
  });

  it('computes totals server-side (10% fee) and HR-style confirmation codes', async () => {
    expect(computeTotalCents(2, 5000, 0.1)).toBe(11000);
    expect(computeTotalCents(1, 6800, 0.1)).toBe(7480);
    const code = generateConfirmationCode();
    expect(code).toMatch(/^HR-[A-Z2-9]{6}$/);

    const { eventId } = await seedEvent(4, 6800);
    const guest = await seedGuest();
    const { booking } = await service.createHold(eventId, guest, 2);
    expect(booking.totalCents).toBe(2 * 6800 + Math.round(2 * 6800 * 0.1));
  });
});
