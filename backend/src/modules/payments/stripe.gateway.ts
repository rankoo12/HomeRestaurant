import Stripe from 'stripe';
import type {
  CheckoutSession,
  CreateSessionInput,
  PaymentGateway,
  VerifiedWebhookEvent,
} from './interfaces.js';

/**
 * Real Stripe implementation of the PaymentGateway seam. Hosted Checkout
 * (mode=payment) — the browser only follows `url`; no Stripe code ships to the
 * frontend. See docs/specs/payments.md §3.
 *
 * Note: with current Stripe API versions the session's PaymentIntent may be
 * created lazily, so `paymentIntentId` can be empty at session creation; the
 * `checkout.session.completed` webhook always carries it and the handler
 * stores it then.
 */
export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: { name: input.eventTitle },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      metadata: { bookingId: input.bookingId, eventId: input.eventId, guestId: input.guestId },
      payment_intent_data: { metadata: { bookingId: input.bookingId } },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return {
      url: session.url,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '',
    };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string): VerifiedWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);

    let bookingId: string | null = null;
    let paymentIntentId: string | null = null;
    let failureReason: string | null = null;

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      bookingId = session.metadata?.bookingId ?? null;
      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      bookingId = intent.metadata?.bookingId ?? null;
      paymentIntentId = intent.id;
      failureReason = intent.last_payment_error?.message ?? 'Payment failed';
    }

    return { id: event.id, type: event.type, bookingId, paymentIntentId, failureReason };
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<void> {
    await this.stripe.refunds.create(
      { payment_intent: paymentIntentId },
      // Stable idempotency key: retrying a failed refund can never double-refund.
      { idempotencyKey: `refund-${paymentIntentId}` },
    );
  }
}
