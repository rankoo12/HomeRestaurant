import { randomUUID } from 'node:crypto';
import type {
  CheckoutSession,
  CreateSessionInput,
  PaymentGateway,
  VerifiedWebhookEvent,
} from './interfaces.js';

/**
 * Demo payment gateway — simulates the FULL Stripe flow with no real charge,
 * for demos and local dev (enabled via PAYMENTS_DEMO_MODE=true). It is NOT a
 * test double: it drives the real PaymentService webhook path.
 *
 * Instead of a hosted Stripe page, the checkout session URL points at an
 * internal demo-pay page (`/checkout/:bookingId/demo`) where the user clicks
 * "Pay" or "Decline". Those actions hit a demo-only backend endpoint that asks
 * this gateway to build a webhook event, which is then processed exactly like a
 * real Stripe delivery — so booking confirmation, payouts, and refunds all run
 * through the production code path.
 *
 * Never enable in production: there is no signature verification (the "webhook"
 * is synthesized server-side from a trusted, authenticated demo endpoint).
 */
export class DemoPaymentGateway implements PaymentGateway {
  constructor(private readonly resultBaseUrl: string) {}

  async createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession> {
    return {
      url: `${this.resultBaseUrl}/checkout/${input.bookingId}/demo`,
      paymentIntentId: `pi_demo_${input.bookingId.slice(0, 8)}`,
    };
  }

  /**
   * The demo endpoint hands us a JSON body it built (kind=succeeded|failed +
   * bookingId + paymentIntentId). We shape it into a VerifiedWebhookEvent. No
   * signature check — the caller is a trusted, authenticated server route.
   */
  verifyWebhook(rawBody: Buffer): VerifiedWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8')) as {
      kind: 'succeeded' | 'failed';
      bookingId: string;
      paymentIntentId: string | null;
    };
    return {
      id: `evt_demo_${randomUUID()}`,
      type:
        body.kind === 'succeeded'
          ? 'checkout.session.completed'
          : 'checkout.session.expired',
      bookingId: body.bookingId,
      paymentIntentId: body.paymentIntentId,
      failureReason: body.kind === 'failed' ? 'demo_declined' : null,
    };
  }

  async refundPaymentIntent(): Promise<void> {
    // No-op: nothing was charged in demo mode.
  }

  /** Build the raw webhook body the demo endpoint will pass to verifyWebhook. */
  static buildEventBody(
    kind: 'succeeded' | 'failed',
    bookingId: string,
    paymentIntentId: string | null,
  ): Buffer {
    return Buffer.from(JSON.stringify({ kind, bookingId, paymentIntentId }), 'utf8');
  }
}
