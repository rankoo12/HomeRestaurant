import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { Booking, NewBooking } from '../../types/index.js';
import type { BookingRepository } from './interfaces.js';

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

  async listByGuest(guestId: string, db: Queryable = getPool()): Promise<Booking[]> {
    const { rows } = await db.query<BookingRow>(
      'SELECT * FROM bookings WHERE guest_id = $1 ORDER BY created_at DESC',
      [guestId],
    );
    return rows.map(mapRow);
  }
}
