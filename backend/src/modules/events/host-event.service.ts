import { withTransaction } from '../../db/index.js';
import { AppError } from '../../types/index.js';
import type { Event, EventWithDetails, NewEvent } from '../../types/index.js';
import type { BookingRepository, RosterEntry, SeatHoldRepository } from '../booking/interfaces.js';
import type { ChefRepository } from '../chef-onboarding/interfaces.js';
import type { NotificationService } from '../notifications/interfaces.js';
import type { PaymentService } from '../payments/payment.service.js';
import type { EarningsRow, PayoutRepository } from '../payments/interfaces.js';
import type { EventRepository, EventUpdate, HostEventListItem } from './interfaces.js';

/** Publish requires this much lead time (events spec §5, approved decision). */
export const PUBLISH_LEAD_TIME_MS = 48 * 3600_000;

export interface CancelResult {
  event: Event;
  refundedBookings: number;
  refundFailures: number;
}

export interface HostDashboard {
  verificationStatus: string;
  upcomingEvents: number;
  seatsSold: number;
  earningsNetCents: number;
  rating: number;
  nextEvent: (HostEventListItem & { startsAt: Date }) | null;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '');
  return base || 'dinner';
}

/**
 * Host event lifecycle (Phase 7). Ownership is enforced on every call
 * (non-owner → 404, never 403 — don't leak). Seat-affecting writes follow the
 * Phase 6 lock protocol. See docs/specs/events.md.
 */
export class HostEventService {
  constructor(
    private readonly events: EventRepository,
    private readonly bookings: BookingRepository,
    private readonly holds: SeatHoldRepository,
    private readonly chefs: ChefRepository,
    private readonly payouts: PayoutRepository,
    private readonly notifier: NotificationService,
    /** Null when Stripe isn't configured — cancel then skips refunds (logged). */
    private readonly payments: PaymentService | null,
  ) {}

  private async ownedEvent(eventId: string, chefId: string, isAdmin: boolean): Promise<EventWithDetails> {
    const event = await this.events.findByIdWithDetails(eventId);
    if (!event || (event.chefId !== chefId && !isAdmin)) {
      throw new AppError('NOT_FOUND', 'Event not found');
    }
    return event;
  }

  listOwn(chefId: string): Promise<HostEventListItem[]> {
    return this.events.listByChef(chefId);
  }

  async create(chefId: string, input: Omit<NewEvent, 'chefId' | 'slug' | 'status'>): Promise<EventWithDetails> {
    const slug = await this.uniqueSlug(slugify(input.title));
    return this.events.create({ ...input, chefId, slug, status: 'draft' });
  }

  async getOwn(eventId: string, chefId: string, isAdmin: boolean): Promise<EventWithDetails> {
    return this.ownedEvent(eventId, chefId, isAdmin);
  }

  /** Mutability matrix (events spec §5). */
  async update(
    eventId: string,
    chefId: string,
    isAdmin: boolean,
    fields: EventUpdate,
  ): Promise<EventWithDetails> {
    const event = await this.ownedEvent(eventId, chefId, isAdmin);
    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new AppError('INVALID_EVENT_STATE', `A ${event.status} event cannot be edited.`);
    }

    const wantsPriceOrSchedule =
      fields.priceCents !== undefined ||
      fields.startsAt !== undefined ||
      fields.durationMinutes !== undefined;
    const wantsSeatsChange = fields.seatsTotal !== undefined;

    if (!wantsPriceOrSchedule && !wantsSeatsChange) {
      return this.events.update(eventId, fields); // cosmetic — always allowed
    }

    // Anything seat/money/schedule shaped is decided under the event row lock.
    return withTransaction(async (client) => {
      const locked = await this.events.findByIdForUpdate(eventId, client);
      if (!locked) throw new AppError('NOT_FOUND', 'Event not found');
      const held = await this.holds.sumLiveHeldSeats(eventId, client);
      const confirmed = await this.bookings.listConfirmedByEvent(eventId, client);
      const hasCommitments = held > 0 || confirmed.length > 0;

      if (wantsPriceOrSchedule && hasCommitments) {
        throw new AppError(
          'INVALID_EVENT_STATE',
          'Price and schedule are locked once guests have booked — cancel and recreate instead.',
        );
      }
      if (fields.seatsTotal !== undefined) {
        const committed = locked.seatsBooked + held;
        if (fields.seatsTotal < committed) {
          throw new AppError(
            'INVALID_EVENT_STATE',
            `Capacity can't drop below the ${committed} already-committed seats.`,
            { seatsCommitted: committed },
          );
        }
      }
      return this.events.update(eventId, fields, client);
    });
  }

  async publish(eventId: string, chefId: string, isAdmin: boolean): Promise<Event> {
    const event = await this.ownedEvent(eventId, chefId, isAdmin);
    if (event.status === 'published') return event; // idempotent
    if (event.status !== 'draft' && event.status !== 'unpublished') {
      throw new AppError('INVALID_EVENT_STATE', `A ${event.status} event cannot be published.`);
    }

    const chef = await this.chefs.findByUserId(event.chefId);
    if (!chef || chef.verificationStatus !== 'approved') {
      throw new AppError(
        'VERIFICATION_REQUIRED',
        'Your host verification must be approved before you can publish.',
      );
    }
    if (event.startsAt.getTime() < Date.now() + PUBLISH_LEAD_TIME_MS) {
      throw new AppError(
        'INVALID_EVENT_STATE',
        'Events must be published at least 48 hours before they start.',
      );
    }
    if (event.courses.length === 0) {
      throw new AppError('INVALID_EVENT_STATE', 'Add at least one menu course before publishing.');
    }
    return this.events.updateStatus(eventId, 'published');
  }

  async unpublish(eventId: string, chefId: string, isAdmin: boolean): Promise<Event> {
    const event = await this.ownedEvent(eventId, chefId, isAdmin);
    if (event.status === 'unpublished') return event; // idempotent
    if (event.status !== 'published') {
      throw new AppError('INVALID_EVENT_STATE', `A ${event.status} event cannot be unpublished.`);
    }
    return this.events.updateStatus(eventId, 'unpublished');
  }

  /**
   * Terminal cancel (events spec §3): release holds + cancel pending bookings
   * in the status transaction; refund confirmed bookings afterwards via the
   * Phase 6 primitive (network calls never run under the row lock).
   */
  async cancel(eventId: string, chefId: string, isAdmin: boolean): Promise<CancelResult> {
    const pre = await this.ownedEvent(eventId, chefId, isAdmin);
    if (pre.status === 'cancelled') {
      return { event: pre, refundedBookings: 0, refundFailures: 0 }; // idempotent
    }
    if (pre.status === 'completed') {
      throw new AppError('INVALID_EVENT_STATE', 'A completed event cannot be cancelled.');
    }

    const confirmed = await withTransaction(async (client) => {
      const locked = await this.events.findByIdForUpdate(eventId, client);
      if (!locked) throw new AppError('NOT_FOUND', 'Event not found');
      await this.holds.releaseAllForEvent(eventId, client);
      await this.events.updateStatus(eventId, 'cancelled', client);
      return this.bookings.listConfirmedByEvent(eventId, client);
    });

    let refunded = 0;
    let failures = 0;
    for (const booking of confirmed) {
      try {
        if (!this.payments) throw new Error('payments not configured — refund skipped');
        await this.payments.refundBooking(booking.id);
        refunded += 1;
      } catch {
        failures += 1; // surfaced in the response; manual-compensation posture (payments.md F4)
      }
      try {
        await this.notifier.bookingCancelled({
          bookingId: booking.id,
          guestId: booking.guestId,
          eventTitle: pre.title,
          refunded: failures === 0,
        });
      } catch {
        // fire-and-forget
      }
    }

    const event = await this.events.findById(eventId);
    return { event: event!, refundedBookings: refunded, refundFailures: failures };
  }

  async duplicate(eventId: string, chefId: string, isAdmin: boolean): Promise<EventWithDetails> {
    const source = await this.ownedEvent(eventId, chefId, isAdmin);
    const slug = await this.uniqueSlug(source.slug);
    return this.events.create({
      slug,
      chefId: source.chefId,
      title: source.title,
      cuisine: source.cuisine,
      shortDescription: source.shortDescription,
      neighborhood: source.neighborhood,
      status: 'draft',
      // Schema requires a date; hosts edit it in the builder (spec said "no
      // date" — +7 days is the closest representable default).
      startsAt: new Date(source.startsAt.getTime() + 7 * 24 * 3600_000),
      durationMinutes: source.durationMinutes,
      priceCents: source.priceCents,
      seatsTotal: source.seatsTotal,
      imageSeed: source.imageSeed,
      courses: source.courses.map(({ position, name, description }) => ({ position, name, description })),
      tags: source.tags,
    });
  }

  async roster(eventId: string, chefId: string, isAdmin: boolean): Promise<RosterEntry[]> {
    await this.ownedEvent(eventId, chefId, isAdmin);
    return this.bookings.listRosterByEvent(eventId);
  }

  async earnings(chefId: string): Promise<{ rows: EarningsRow[]; summary: Record<string, number> }> {
    const rows = await this.payouts.listForEarnings(chefId);
    const sum = (filter: (r: EarningsRow) => boolean) =>
      rows.filter(filter).reduce((acc, r) => acc + r.netCents, 0);
    return {
      rows,
      summary: {
        lifetimeNetCents: sum((r) => r.status !== 'failed'),
        pendingNetCents: sum((r) => r.status === 'pending'),
        paidNetCents: sum((r) => r.status === 'paid'),
        feesWithheldCents: rows
          .filter((r) => r.status !== 'failed')
          .reduce((acc, r) => acc + r.feeCents, 0),
      },
    };
  }

  async dashboard(chefId: string): Promise<HostDashboard> {
    const [profile, ownEvents, { summary }, publicProfile] = await Promise.all([
      this.chefs.findByUserId(chefId),
      this.events.listByChef(chefId),
      this.earnings(chefId),
      this.chefs.findPublicByUserId(chefId),
    ]);
    if (!profile) throw new AppError('NOT_FOUND', 'No host profile yet');

    const now = Date.now();
    const future = ownEvents.filter((e) => e.startsAt.getTime() > now && e.status === 'published');
    return {
      verificationStatus: profile.verificationStatus,
      upcomingEvents: future.length,
      seatsSold: future.reduce((acc, e) => acc + e.seatsBooked, 0),
      earningsNetCents: summary.lifetimeNetCents ?? 0,
      rating: publicProfile?.stats.rating ?? 0,
      nextEvent: future.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null,
    };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let i = 2; i < 50; i++) {
      const existing = await this.events.findBySlug(candidate);
      if (!existing) return candidate;
      candidate = `${base}-${i}`;
    }
    throw new Error(`could not find a free slug for "${base}"`);
  }
}
