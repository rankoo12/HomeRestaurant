import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { Booking, BookingStatus, NewBooking } from '../../types/index.js';
import type { BookingRepository, RosterEntry } from './interfaces.js';

interface BookingRow {
  id: string;
  event_id: string;
  guest_id: string;
  seats: number;
  status: Booking['status'];
  confirmation_code: string;
  total_cents: number;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: BookingRow): Booking {
  return {
    id: row.id,
    eventId: row.event_id,
    guestId: row.guest_id,
    seats: row.seats,
    status: row.status,
    confirmationCode: row.confirmation_code,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresBookingRepository implements BookingRepository {
  async create(input: NewBooking, db: Queryable = getPool()): Promise<Booking> {
    const { rows } = await db.query<BookingRow>(
      `INSERT INTO bookings (event_id, guest_id, seats, status, confirmation_code, total_cents)
       VALUES ($1, $2, $3, COALESCE($4::booking_status, 'pending'), $5, $6)
       RETURNING *`,
      [
        input.eventId,
        input.guestId,
        input.seats,
        input.status ?? null,
        input.confirmationCode,
        input.totalCents,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('bookings INSERT returned no row');
    return mapRow(row);
  }

  async findById(id: string, db: Queryable = getPool()): Promise<Booking | null> {
    const { rows } = await db.query<BookingRow>('SELECT * FROM bookings WHERE id = $1', [id]);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async findByIdForUpdate(id: string, db: Queryable): Promise<Booking | null> {
    const { rows } = await db.query<BookingRow>(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [id],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async listByGuest(guestId: string, db: Queryable = getPool()): Promise<Booking[]> {
    const { rows } = await db.query<BookingRow>(
      'SELECT * FROM bookings WHERE guest_id = $1 ORDER BY created_at DESC',
      [guestId],
    );
    return rows.map(mapRow);
  }

  async listConfirmedByEvent(eventId: string, db: Queryable = getPool()): Promise<Booking[]> {
    const { rows } = await db.query<BookingRow>(
      `SELECT * FROM bookings WHERE event_id = $1 AND status = 'confirmed' ORDER BY created_at`,
      [eventId],
    );
    return rows.map(mapRow);
  }

  async listRosterByEvent(eventId: string, db: Queryable = getPool()): Promise<RosterEntry[]> {
    const { rows } = await db.query<{
      booking_id: string;
      confirmation_code: string;
      guest_name: string;
      avatar_seed: number;
      seats: number;
      dietary_prefs: string[];
      booking_status: BookingStatus;
      payment_status: string | null;
      total_cents: number;
      created_at: Date;
    }>(
      `SELECT b.id AS booking_id, b.confirmation_code, u.full_name AS guest_name,
              u.avatar_seed, b.seats, u.dietary_prefs, b.status AS booking_status,
              p.status::text AS payment_status, b.total_cents, b.created_at
         FROM bookings b
         JOIN users u ON u.id = b.guest_id
         LEFT JOIN payments p ON p.booking_id = b.id
        WHERE b.event_id = $1
        ORDER BY b.created_at`,
      [eventId],
    );
    return rows.map((r) => ({
      bookingId: r.booking_id,
      confirmationCode: r.confirmation_code,
      guestName: r.guest_name,
      avatarSeed: r.avatar_seed,
      seats: r.seats,
      dietaryPrefs: r.dietary_prefs,
      bookingStatus: r.booking_status,
      paymentStatus: r.payment_status,
      totalCents: r.total_cents,
      createdAt: r.created_at,
    }));
  }

  async updateStatus(id: string, status: BookingStatus, db: Queryable = getPool()): Promise<Booking> {
    const { rows } = await db.query<BookingRow>(
      'UPDATE bookings SET status = $2 WHERE id = $1 RETURNING *',
      [id, status],
    );
    const row = rows[0];
    if (!row) throw new Error(`bookings UPDATE: no row for id ${id}`);
    return mapRow(row);
  }
}
