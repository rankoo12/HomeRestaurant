import type { Queryable } from '../../db/index.js';
import type { Booking, NewBooking } from '../../types/index.js';

/**
 * Persistence contract for bookings.
 *
 * Phase 2 provides basic create/read so the schema is exercised and seedable.
 * The concurrency-safe allocation flow (seat holds, FOR UPDATE, capacity
 * re-check) is layered on in Phase 6 — see docs/specs/data/05-booking-tables.md.
 */
export interface BookingRepository {
  create(input: NewBooking, db?: Queryable): Promise<Booking>;
  findById(id: string, db?: Queryable): Promise<Booking | null>;
  listByGuest(guestId: string, db?: Queryable): Promise<Booking[]>;
}
