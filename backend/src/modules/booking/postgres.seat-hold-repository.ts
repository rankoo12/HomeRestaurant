import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewSeatHold, SeatHold, SeatHoldStatus } from '../../types/index.js';
import type { SeatHoldRepository } from './interfaces.js';

interface SeatHoldRow {
  id: string;
  event_id: string;
  guest_id: string;
  seats: number;
  status: SeatHoldStatus;
  expires_at: Date;
  booking_id: string | null;
  created_at: Date;
}

function mapRow(row: SeatHoldRow): SeatHold {
  return {
    id: row.id,
    eventId: row.event_id,
    guestId: row.guest_id,
    seats: row.seats,
    status: row.status,
    expiresAt: row.expires_at,
    bookingId: row.booking_id,
    createdAt: row.created_at,
  };
}

export class PostgresSeatHoldRepository implements SeatHoldRepository {
  async create(input: NewSeatHold, db: Queryable = getPool()): Promise<SeatHold> {
    const { rows } = await db.query<SeatHoldRow>(
      `INSERT INTO seat_holds (event_id, guest_id, seats, status, expires_at, booking_id)
       VALUES ($1, $2, $3, 'active', $4, $5)
       RETURNING *`,
      [input.eventId, input.guestId, input.seats, input.expiresAt, input.bookingId],
    );
    const row = rows[0];
    if (!row) throw new Error('seat_holds INSERT returned no row');
    return mapRow(row);
  }

  async findActiveByGuestEvent(
    eventId: string,
    guestId: string,
    db: Queryable = getPool(),
  ): Promise<SeatHold | null> {
    const { rows } = await db.query<SeatHoldRow>(
      `SELECT * FROM seat_holds
       WHERE event_id = $1 AND guest_id = $2 AND status = 'active'`,
      [eventId, guestId],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async findByBookingId(bookingId: string, db: Queryable = getPool()): Promise<SeatHold | null> {
    const { rows } = await db.query<SeatHoldRow>(
      'SELECT * FROM seat_holds WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1',
      [bookingId],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async sumLiveHeldSeats(eventId: string, db: Queryable): Promise<number> {
    const { rows } = await db.query<{ held: string }>(
      `SELECT COALESCE(SUM(seats), 0)::text AS held FROM seat_holds
       WHERE event_id = $1 AND status = 'active' AND expires_at > now()`,
      [eventId],
    );
    return Number(rows[0]?.held ?? 0);
  }

  async updateStatus(id: string, status: SeatHoldStatus, db: Queryable = getPool()): Promise<void> {
    await db.query('UPDATE seat_holds SET status = $2 WHERE id = $1', [id, status]);
  }

  async extendExpiry(id: string, expiresAt: Date, db: Queryable = getPool()): Promise<void> {
    await db.query('UPDATE seat_holds SET expires_at = $2 WHERE id = $1', [id, expiresAt]);
  }

  async releaseAllForEvent(eventId: string, db: Queryable = getPool()): Promise<number> {
    const { rows } = await db.query<{ booking_id: string | null }>(
      `UPDATE seat_holds SET status = 'released'
        WHERE event_id = $1 AND status = 'active'
        RETURNING booking_id`,
      [eventId],
    );
    const bookingIds = rows.map((r) => r.booking_id).filter((id): id is string => id !== null);
    if (bookingIds.length > 0) {
      await db.query(
        `UPDATE bookings SET status = 'cancelled'
          WHERE id = ANY($1::uuid[]) AND status = 'pending'`,
        [bookingIds],
      );
    }
    return rows.length;
  }

  async sweepExpired(db: Queryable = getPool()): Promise<number> {
    // Hygiene only — availability queries already discount past-due holds via
    // `expires_at > now()`; this just tidies statuses for the UI/admin.
    const { rows } = await db.query<{ booking_id: string | null }>(
      `UPDATE seat_holds SET status = 'expired'
       WHERE status = 'active' AND expires_at <= now()
       RETURNING booking_id`,
    );
    const bookingIds = rows.map((r) => r.booking_id).filter((id): id is string => id !== null);
    if (bookingIds.length > 0) {
      await db.query(
        `UPDATE bookings SET status = 'cancelled'
         WHERE id = ANY($1::uuid[]) AND status = 'pending'`,
        [bookingIds],
      );
    }
    return rows.length;
  }
}
