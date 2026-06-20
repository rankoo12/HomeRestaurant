import { withTransaction } from '../../db/index.js';
import { AppError } from '../../types/index.js';
import type { BookingRepository, SeatHoldRepository } from '../booking/interfaces.js';
import type { EventRepository } from '../events/interfaces.js';
import type { NotificationService } from '../notifications/interfaces.js';
import type { BookingService } from '../booking/booking.service.js';
import { HOLD_PAYMENT_TTL_MINUTES } from '../booking/booking.service.js';
import type {
  PaymentGateway,
  PaymentRepository,
  PayoutRepository,
  VerifiedWebhookEvent,
  WebhookEventLedger,
} from './interfaces.js';

/** Stripe's minimum Checkout Session lifetime. The hold (35 min) outlives it. */
const SESSION_TTL_MINUTES = 30;

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

/**
 * Guest-payment flows for Phase 6: hosted-checkout session creation and the
 * webhook state machine. Confirmation happens ONLY here, never from a
 * client-callable endpoint. See docs/specs/payments.md §4–§6.
 */
export class PaymentService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly payments: PaymentRepository,
    private readonly ledger: WebhookEventLedger,
    private readonly bookings: BookingRepository,
    private readonly holds: SeatHoldRepository,
    private readonly events: EventRepository,
    private readonly payouts: PayoutRepository,
    private readonly bookingService: BookingService,
    private readonly notifier: NotificationService,
    private readonly resultBaseUrl: string,
  ) {}

  /**
   * Create (or refresh) the hosted-checkout session for a pending booking.
   * The hold is extended BEFORE the Stripe network call, and no DB row lock is
   * held across it (a network call under `FOR UPDATE` would stall every other
   * checkout for the event).
   */
  async createCheckoutSession(
    bookingId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ url: string }> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking || (booking.guestId !== userId && !isAdmin)) {
      throw new AppError('NOT_FOUND', 'Booking not found');
    }
    const event = await this.events.findById(booking.eventId);
    const eventTitle = event?.title ?? 'Home Restaurant dinner';
    if (booking.status !== 'pending') {
      throw new AppError('INVALID_BOOKING_STATE', 'This booking is not awaiting payment.');
    }
    const hold = await this.holds.findByBookingId(bookingId);
    if (!hold || hold.status !== 'active' || hold.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        'INVALID_BOOKING_STATE',
        'Your seat hold has expired — please reserve again.',
      );
    }

    // Extend the hold to cover the payment window (booking spec §5), then make
    // sure exactly one payments row exists for this booking (unique booking_id).
    await this.holds.extendExpiry(hold.id, new Date(Date.now() + HOLD_PAYMENT_TTL_MINUTES * 60_000));
    const payment = await this.payments.upsertForBooking({
      bookingId,
      amountCents: booking.totalCents, // server-computed at hold time; never from the client
    });

    const session = await this.gateway.createCheckoutSession({
      bookingId,
      eventId: booking.eventId,
      guestId: booking.guestId,
      amountCents: booking.totalCents,
      currency: payment.currency,
      eventTitle,
      successUrl: `${this.resultBaseUrl}/guest/bookings/${bookingId}?paid=1`,
      cancelUrl: `${this.resultBaseUrl}/checkout/${bookingId}?cancelled=1`,
      expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000),
    });

    if (session.paymentIntentId) {
      await this.payments.upsertForBooking({
        bookingId,
        amountCents: booking.totalCents,
        stripePaymentIntentId: session.paymentIntentId,
      });
    }
    return { url: session.url };
  }

  /**
   * Webhook entry point. Signature is verified by the caller (route) via the
   * gateway; this method runs the state machine. Ledger insert + effects share
   * one transaction: a duplicate delivery is a committed no-op, a failed
   * transaction leaves no ledger row so Stripe's retry reprocesses (F5).
   */
  async handleWebhook(event: VerifiedWebhookEvent): Promise<WebhookOutcome> {
    const result = await withTransaction(async (client) => {
      const first = await this.ledger.recordOnce(event.id, event.type, client);
      if (!first) return { outcome: 'duplicate' as const };

      if (!event.bookingId) return { outcome: 'ignored' as const };
      const payment = await this.payments.findByBookingId(event.bookingId, client);
      if (!payment) return { outcome: 'ignored' as const };

      switch (event.type) {
        case 'checkout.session.completed': {
          if (payment.status === 'succeeded' || payment.status === 'refunded') {
            return { outcome: 'processed' as const }; // state machine: forward-only
          }
          if (event.paymentIntentId && !payment.stripePaymentIntentId) {
            await this.payments.upsertForBooking(
              {
                bookingId: event.bookingId,
                amountCents: payment.amountCents,
                stripePaymentIntentId: event.paymentIntentId,
              },
              client,
            );
          }
          await this.payments.updateStatus(payment.id, 'succeeded', null, client);
          const confirm = await this.bookingService.confirmPaid(event.bookingId, client);
          if (confirm === 'confirmed') {
            // Payout ledger record, same commit as the confirmation
            // (payments.md §11): host nets the seat subtotal, platform keeps
            // the service fee. Ledger-only — no Connect transfer in Phase 7.
            const booking = await this.bookings.findById(event.bookingId, client);
            const ev = booking ? await this.events.findById(booking.eventId, client) : null;
            if (booking && ev) {
              const net = booking.seats * ev.priceCents;
              await this.payouts.create(
                {
                  chefId: ev.chefId,
                  bookingId: booking.id,
                  grossCents: booking.totalCents,
                  feeCents: booking.totalCents - net,
                  netCents: net,
                },
                client,
              );
            }
          }
          if (confirm === 'lost-seat') {
            // Paid but seats truly gone — refund after commit (F4).
            return {
              outcome: 'processed' as const,
              refundIntentId: event.paymentIntentId ?? payment.stripePaymentIntentId,
              refundPaymentId: payment.id,
              refundBookingId: event.bookingId,
            };
          }
          return {
            outcome: 'processed' as const,
            notifyBookingId: confirm === 'confirmed' ? event.bookingId : undefined,
          };
        }

        case 'checkout.session.expired': {
          if (payment.status !== 'pending') return { outcome: 'processed' as const };
          await this.payments.updateStatus(payment.id, 'failed', 'session_expired', client);
          const hold = await this.holds.findByBookingId(event.bookingId, client);
          if (hold && hold.status === 'active') {
            await this.holds.updateStatus(hold.id, 'released', client);
          }
          const booking = await this.bookings.findById(event.bookingId, client);
          if (booking?.status === 'pending') {
            await this.bookings.updateStatus(event.bookingId, 'cancelled', client);
          }
          return { outcome: 'processed' as const };
        }

        case 'payment_intent.payment_failed': {
          // Annotation only — the guest may still retry within the session (F1).
          await this.payments.updateStatus(payment.id, payment.status, event.failureReason, client);
          return { outcome: 'processed' as const };
        }

        default:
          return { outcome: 'ignored' as const };
      }
    });

    if ('refundIntentId' in result && result.refundIntentId) {
      // Network call deliberately outside the transaction. If it throws, the
      // booking stays cancelled with payment 'succeeded' — the queryable
      // inconsistency flag for manual compensation (payments.md F4).
      await this.gateway.refundPaymentIntent(result.refundIntentId);
      await this.payments.updateStatus(result.refundPaymentId, 'refunded', null);
      await this.bookings.updateStatus(result.refundBookingId, 'refunded');
    }

    if ('notifyBookingId' in result && result.notifyBookingId) {
      // Fire-and-forget: a notify failure must never fail the webhook.
      try {
        const booking = await this.bookings.findById(result.notifyBookingId);
        const event_ = booking ? await this.events.findById(booking.eventId) : null;
        if (booking && event_) {
          await this.notifier.bookingConfirmed({
            bookingId: booking.id,
            confirmationCode: booking.confirmationCode,
            guestId: booking.guestId,
            eventTitle: event_.title,
            startsAt: event_.startsAt,
            seats: booking.seats,
            totalCents: booking.totalCents,
            addressLine: event_.addressLine,
          });
        }
      } catch {
        // Logged delivery is best-effort; the confirmation itself is committed.
      }
    }
    return result.outcome;
  }

  /**
   * Full-refund primitive for a confirmed booking (admin/host flows wire this
   * in Phases 7–8; the F4 path above uses the gateway directly). Idempotent.
   */
  async refundBooking(bookingId: string): Promise<void> {
    const payment = await this.payments.findByBookingId(bookingId);
    if (!payment) throw new AppError('NOT_FOUND', 'Payment not found');
    if (payment.status === 'refunded') return; // no-op
    if (payment.status !== 'succeeded' || !payment.stripePaymentIntentId) {
      throw new AppError('INVALID_BOOKING_STATE', 'Only a succeeded payment can be refunded.');
    }

    await this.gateway.refundPaymentIntent(payment.stripePaymentIntentId);

    await withTransaction(async (client) => {
      const booking = await this.bookings.findById(bookingId, client);
      if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');
      // Lock order: events first, then bookings (booking spec §6b).
      await this.events.findByIdForUpdate(booking.eventId, client);
      const locked = await this.bookings.findByIdForUpdate(bookingId, client);
      if (!locked || locked.status === 'refunded') return;
      if (locked.status === 'confirmed') {
        await this.events.incrementSeatsBooked(locked.eventId, -locked.seats, client);
      }
      await this.bookings.updateStatus(bookingId, 'refunded', client);
      await this.payments.updateStatus(payment.id, 'refunded', null, client);
      // A refunded booking's pending payout will never be paid (payments.md §11).
      await this.payouts.markFailedByBooking(bookingId, client);
    });
  }
}
