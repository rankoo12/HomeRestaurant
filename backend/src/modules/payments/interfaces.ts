import type { Queryable } from '../../db/index.js';
import type {
  NewPayment,
  NewPayout,
  Payment,
  PaymentStatus,
  Payout,
  PayoutStatus,
} from '../../types/index.js';

/**
 * Persistence contract for payouts (host earnings).
 *
 * Phase 2 provides create/read for seeding the earnings screen. Stripe
 * Connect transfers are Phase 7.
 */
export interface PayoutRepository {
  create(input: NewPayout, db?: Queryable): Promise<Payout>;
  listByChef(chefId: string, db?: Queryable): Promise<Payout[]>;
  /** Earnings rows: payout + event title/date + booking code (payments spec §11). */
  listForEarnings(chefId: string, db?: Queryable): Promise<EarningsRow[]>;
  /** Refund interaction: a refunded booking's pending payout will not be paid. */
  markFailedByBooking(bookingId: string, db?: Queryable): Promise<void>;
  // --- Phase 8 payout admin (admin spec §4) ---
  findById(id: string, db?: Queryable): Promise<Payout | null>;
  /** Cross-chef ledger for the admin view, joined with chef name + event title. */
  listAll(filters?: PayoutListFilters, db?: Queryable): Promise<AdminPayoutRow[]>;
  /**
   * `pending` → `paid` + `paid_at = now()`. Returns the updated payout, or
   * null when the row wasn't pending (caller decides idempotent-vs-409).
   */
  markPaid(id: string, db?: Queryable): Promise<Payout | null>;
}

/** One row on /host/earnings. */
export interface EarningsRow extends Payout {
  eventTitle: string | null;
  eventStartsAt: Date | null;
  confirmationCode: string | null;
}

/** One row in the admin payout ledger (admin spec §4). */
export interface AdminPayoutRow extends EarningsRow {
  chefName: string;
}

export interface PayoutListFilters {
  status?: PayoutStatus;
  limit?: number;
  offset?: number;
}

/**
 * Persistence contract for payments (guest charges, 1:1 with bookings).
 * Phase 6. See docs/specs/payments.md §6.
 */
export interface PaymentRepository {
  /** Insert-or-update on the unique booking_id — one payments row per booking, always. */
  upsertForBooking(input: NewPayment, db?: Queryable): Promise<Payment>;
  findByBookingId(bookingId: string, db?: Queryable): Promise<Payment | null>;
  updateStatus(
    id: string,
    status: PaymentStatus,
    failureReason?: string | null,
    db?: Queryable,
  ): Promise<Payment>;
}

/**
 * Webhook event ledger — strict idempotency for Stripe deliveries. The insert
 * happens in the SAME transaction as the event's effects; a duplicate delivery
 * hits the PK conflict and is skipped. See docs/specs/payments.md §5.
 */
export interface WebhookEventLedger {
  /** True if recorded (first delivery); false on conflict (duplicate). */
  recordOnce(eventId: string, type: string, db: Queryable): Promise<boolean>;
}

/** A created hosted-checkout session (Stripe Checkout, mode=payment). */
export interface CheckoutSession {
  /** Hosted payment page the browser is redirected to. */
  url: string;
  /** The session's underlying PaymentIntent id — stored on the payments row. */
  paymentIntentId: string;
}

export interface CreateSessionInput {
  bookingId: string;
  eventId: string;
  guestId: string;
  amountCents: number;
  currency: string;
  eventTitle: string;
  successUrl: string;
  cancelUrl: string;
  /** Session expiry (Stripe minimum 30 min). */
  expiresAt: Date;
}

/** A verified, minimal view of an incoming Stripe webhook event. */
export interface VerifiedWebhookEvent {
  id: string;
  type: string;
  /** Our booking id from session metadata (absent for foreign/unknown events). */
  bookingId: string | null;
  paymentIntentId: string | null;
  /** Human decline reason, when the event carries one. */
  failureReason: string | null;
}

/**
 * Payment gateway seam (interface-first). `StripePaymentGateway` is the real
 * implementation; tests inject a fake — CI never needs Stripe keys or network.
 * See docs/specs/payments.md §9.
 */
export interface PaymentGateway {
  createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession>;
  /** Verify the webhook signature against the raw body; throw on mismatch. */
  verifyWebhook(rawBody: Buffer, signatureHeader: string): VerifiedWebhookEvent;
  /** Full refund by payment-intent id. Idempotent at the Stripe layer. */
  refundPaymentIntent(paymentIntentId: string): Promise<void>;
}
