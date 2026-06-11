import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { withTransaction } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import { AppError } from '../../types/index.js';
import type { Booking, Event, SeatHold } from '../../types/index.js';
import type { EventListItem, EventRepository } from '../events/interfaces.js';
import type { BookingRepository, BookingView, SeatHoldRepository } from './interfaces.js';

export const HOLD_TTL_MINUTES = 10;
/** Hold extension when a payment session starts — always outlives the 30-min Stripe session. */
export const HOLD_PAYMENT_TTL_MINUTES = 35;
const MAX_PARTY_SIZE = 8;

/** Unambiguous alphabet (no 0/O/1/I) for "HR-9F2K" style codes. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateConfirmationCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `HR-${code}`;
}

/** seats × price + service fee, all server-side. See docs/specs/payments.md §3. */
export function computeTotalCents(seats: number, priceCents: number, feeRate: number): number {
  const subtotal = seats * priceCents;
  return subtotal + Math.round(subtotal * feeRate);
}

export interface HoldResult {
  booking: Booking;
  hold: SeatHold;
  /** True when this replayed an existing identical hold (200, not 201). */
  replayed: boolean;
}

export type ConfirmOutcome = 'confirmed' | 'already-confirmed' | 'lost-seat';

/**
 * Concurrency-safe booking flows. Every seat-affecting write locks the event
 * row first (`SELECT … FOR UPDATE`) — the single serialization point — then
 * re-checks availability inside the lock. READ COMMITTED + the row lock is the
 * chosen strategy; Redis is never consulted. See
 * docs/specs/booking-and-concurrency.md §6–§7.
 */
export class BookingService {
  constructor(
    private readonly events: EventRepository,
    private readonly bookings: BookingRepository,
    private readonly holds: SeatHoldRepository,
    private readonly serviceFeeRate: number,
  ) {}

  /** Availability identity (§4) — only authoritative under the event row lock. */
  private async availableSeats(event: Event, db: Queryable): Promise<number> {
    const held = await this.holds.sumLiveHeldSeats(event.id, db);
    return event.seatsTotal - event.seatsBooked - held;
  }

  /** §6a — create hold + pending booking; idempotent per guest/event. */
  async createHold(eventId: string, guestId: string, seats: number): Promise<HoldResult> {
    if (seats < 1 || seats > MAX_PARTY_SIZE) {
      throw new AppError('VALIDATION_ERROR', `Seats must be between 1 and ${MAX_PARTY_SIZE}`);
    }

    try {
      return await withTransaction(async (client) => {
        const event = await this.events.findByIdForUpdate(eventId, client);
        if (!event || event.status !== 'published') {
          throw new AppError('NOT_FOUND', 'Event not found');
        }
        if (event.chefId === guestId) {
          throw new AppError('FORBIDDEN', 'Hosts cannot book their own event');
        }

        // Idempotency: identical live hold → replay; anything else → replace.
        const existing = await this.holds.findActiveByGuestEvent(eventId, guestId, client);
        if (existing) {
          const live = existing.expiresAt.getTime() > Date.now();
          if (live && existing.seats === seats && existing.bookingId) {
            const booking = await this.bookings.findById(existing.bookingId, client);
            if (booking && booking.status === 'pending') {
              return { booking, hold: existing, replayed: true };
            }
          }
          await this.holds.updateStatus(existing.id, live ? 'released' : 'expired', client);
          if (existing.bookingId) {
            const stale = await this.bookings.findById(existing.bookingId, client);
            if (stale?.status === 'pending') {
              await this.bookings.updateStatus(existing.bookingId, 'cancelled', client);
            }
          }
        }

        const available = await this.availableSeats(event, client);
        if (seats > available) {
          throw new AppError(
            'INSUFFICIENT_SEATS',
            available > 0
              ? `Only ${available} seat${available === 1 ? ' is' : 's are'} still available for this dinner.`
              : 'This dinner is fully booked.',
            { eventId, requestedSeats: seats, availableSeats: available },
          );
        }

        const booking = await this.bookings.create(
          {
            eventId,
            guestId,
            seats,
            status: 'pending',
            confirmationCode: generateConfirmationCode(),
            totalCents: computeTotalCents(seats, event.priceCents, this.serviceFeeRate),
          },
          client,
        );
        const hold = await this.holds.create(
          {
            eventId,
            guestId,
            seats,
            expiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60_000),
            bookingId: booking.id,
          },
          client,
        );
        return { booking, hold, replayed: false };
      });
    } catch (err) {
      // Enrich the overbooking abort with same-chef alternatives — computed
      // OUTSIDE the lock/transaction (booking spec §8).
      if (err instanceof AppError && err.code === 'INSUFFICIENT_SEATS') {
        const alternatives = await this.alternatives(eventId, seats);
        throw new AppError('INSUFFICIENT_SEATS', err.message, { ...err.details, alternatives });
      }
      throw err;
    }
  }

  /** Up to 3 other upcoming dinners by the same chef with enough seats. */
  private async alternatives(eventId: string, seats: number): Promise<EventListItem[]> {
    const event = await this.events.findById(eventId);
    if (!event) return [];
    const { items } = await this.events.listForDiscovery({
      status: 'published',
      chefId: event.chefId,
      sort: 'soonest',
      limit: 10,
    });
    return items.filter((e) => e.id !== eventId && e.seatsLeft >= seats).slice(0, 3);
  }

  /**
   * §6b — confirm a paid booking. Called ONLY by the verified payment webhook
   * (docs/specs/payments.md §4/§5); there is no client-callable confirm. Runs
   * on the caller's transaction client so payment-state writes and the webhook
   * ledger insert commit atomically with the confirmation.
   */
  async confirmPaid(bookingId: string, client: pg.PoolClient): Promise<ConfirmOutcome> {
    const existing = await this.bookings.findById(bookingId, client);
    if (!existing) throw new AppError('NOT_FOUND', 'Booking not found');

    // Lock order is fixed everywhere: events first, then bookings (§6b).
    const event = await this.events.findByIdForUpdate(existing.eventId, client);
    if (!event) throw new AppError('NOT_FOUND', 'Event not found');
    const booking = await this.bookings.findByIdForUpdate(bookingId, client);
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');

    if (booking.status === 'confirmed') return 'already-confirmed';

    const hold = await this.holds.findByBookingId(bookingId, client);
    const holdLive =
      hold !== null && hold.status === 'active' && hold.expiresAt.getTime() > Date.now();

    if (holdLive) {
      await this.holds.updateStatus(hold.id, 'consumed', client);
      await this.events.incrementSeatsBooked(event.id, booking.seats, client);
      await this.bookings.updateStatus(booking.id, 'confirmed', client);
      return 'confirmed';
    }

    // Hold lapsed but the guest paid: grace path if seats are still free.
    const available = await this.availableSeats(event, client);
    if (booking.seats <= available) {
      if (hold) await this.holds.updateStatus(hold.id, 'consumed', client);
      await this.events.incrementSeatsBooked(event.id, booking.seats, client);
      await this.bookings.updateStatus(booking.id, 'confirmed', client);
      return 'confirmed';
    }

    // LOST-SEAT: paid but seats truly gone — payments layer refunds (F4).
    await this.bookings.updateStatus(booking.id, 'cancelled', client);
    return 'lost-seat';
  }

  /** Cancel an unpaid booking / abandon checkout. Idempotent. */
  async cancel(bookingId: string, userId: string, isAdmin: boolean): Promise<Booking> {
    return withTransaction(async (client) => {
      const existing = await this.bookings.findById(bookingId, client);
      if (!existing || (existing.guestId !== userId && !isAdmin)) {
        throw new AppError('NOT_FOUND', 'Booking not found');
      }

      const event = await this.events.findByIdForUpdate(existing.eventId, client);
      if (!event) throw new AppError('NOT_FOUND', 'Event not found');
      const booking = await this.bookings.findByIdForUpdate(bookingId, client);
      if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');

      if (booking.status === 'cancelled') return booking; // idempotent no-op
      if (booking.status !== 'pending') {
        throw new AppError(
          'INVALID_BOOKING_STATE',
          'A confirmed booking cannot be cancelled here — refunds are handled separately.',
        );
      }

      const hold = await this.holds.findByBookingId(bookingId, client);
      if (hold && hold.status === 'active') {
        await this.holds.updateStatus(hold.id, 'released', client);
      }
      return this.bookings.updateStatus(bookingId, 'cancelled', client);
    });
  }

  /**
   * Booking view for the checkout/confirmation pages. Owner-only (admin
   * allowed); non-owners get 404 to avoid leaking existence. Lazily flips a
   * past-due hold/booking for accurate UX (hygiene — correctness never
   * depends on it; availability queries discount stale holds regardless).
   */
  async getView(bookingId: string, userId: string, isAdmin: boolean): Promise<BookingView> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking || (booking.guestId !== userId && !isAdmin)) {
      throw new AppError('NOT_FOUND', 'Booking not found');
    }

    let hold = await this.holds.findByBookingId(bookingId);
    if (
      hold &&
      hold.status === 'active' &&
      hold.expiresAt.getTime() <= Date.now() &&
      booking.status === 'pending'
    ) {
      await this.holds.updateStatus(hold.id, 'expired');
      await this.bookings.updateStatus(booking.id, 'cancelled');
      hold = { ...hold, status: 'expired' };
      booking.status = 'cancelled';
    }

    const event = await this.events.findById(booking.eventId);
    if (!event) throw new AppError('NOT_FOUND', 'Event not found');

    return {
      booking,
      hold: hold ? { status: hold.status, expiresAt: hold.expiresAt } : null,
      payment: null, // filled in by the route via the payments repository
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        neighborhood: event.neighborhood,
        startsAt: event.startsAt,
        priceCents: event.priceCents,
        imageSeed: event.imageSeed,
      },
    };
  }
}
