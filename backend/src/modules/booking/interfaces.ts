import type { Queryable } from '../../db/index.js';
import type { Booking, BookingStatus, NewBooking, NewSeatHold, SeatHold } from '../../types/index.js';

/**
 * Persistence contracts for bookings + seat holds.
 *
 * Phase 2 provided basic create/read; Phase 6 layers on the concurrency-safe
 * allocation flow (seat holds, FOR UPDATE, capacity re-check). All mutating
 * methods are designed to run inside the booking transaction — callers pass
 * the transaction client via `db`. See docs/specs/booking-and-concurrency.md.
 */
export interface BookingRepository {
  create(input: NewBooking, db?: Queryable): Promise<Booking>;
  findById(id: string, db?: Queryable): Promise<Booking | null>;
  /** Row-locked read — only meaningful inside a transaction (confirm flow §6b). */
  findByIdForUpdate(id: string, db: Queryable): Promise<Booking | null>;
  listByGuest(guestId: string, db?: Queryable): Promise<Booking[]>;
  /** Confirmed bookings for an event (host-cancel refund pass — events spec §3). */
  listConfirmedByEvent(eventId: string, db?: Queryable): Promise<Booking[]>;
  /** Guest roster: bookings joined with guest display + payment status (events spec §4). */
  listRosterByEvent(eventId: string, db?: Queryable): Promise<RosterEntry[]>;
  updateStatus(id: string, status: BookingStatus, db?: Queryable): Promise<Booking>;
}

/** One roster row on /host/events/:id/guests. */
export interface RosterEntry {
  bookingId: string;
  confirmationCode: string;
  guestName: string;
  avatarSeed: number;
  seats: number;
  dietaryPrefs: string[];
  bookingStatus: BookingStatus;
  paymentStatus: string | null;
  totalCents: number;
  createdAt: Date;
}

export interface SeatHoldRepository {
  create(input: NewSeatHold, db?: Queryable): Promise<SeatHold>;
  /** The guest's `active` hold for an event (live or stale), if any. */
  findActiveByGuestEvent(eventId: string, guestId: string, db?: Queryable): Promise<SeatHold | null>;
  findByBookingId(bookingId: string, db?: Queryable): Promise<SeatHold | null>;
  /** Sum of seats in live holds (`active` AND not past `expires_at`) for an event. */
  sumLiveHeldSeats(eventId: string, db: Queryable): Promise<number>;
  updateStatus(id: string, status: SeatHold['status'], db?: Queryable): Promise<void>;
  /** Push `expires_at` out (payment-session window — booking spec §5). */
  extendExpiry(id: string, expiresAt: Date, db?: Queryable): Promise<void>;
  /** Hygiene sweep: flip past-due active holds to `expired`, cancel their pending bookings. */
  sweepExpired(db?: Queryable): Promise<number>;
  /**
   * Host-cancel: release every active hold on the event and cancel its pending
   * booking. Returns the number of holds released. (events spec §3)
   */
  releaseAllForEvent(eventId: string, db?: Queryable): Promise<number>;
}

/** The view the booking API returns (GET /api/bookings/:id). */
export interface BookingView {
  booking: Booking;
  hold: { status: SeatHold['status']; expiresAt: Date } | null;
  payment: { status: string; failureReason: string | null } | null;
  event: {
    id: string;
    slug: string;
    title: string;
    neighborhood: string;
    startsAt: Date;
    priceCents: number;
    imageSeed: number;
  };
}
