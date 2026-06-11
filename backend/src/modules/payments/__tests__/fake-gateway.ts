import type {
  CheckoutSession,
  CreateSessionInput,
  PaymentGateway,
  VerifiedWebhookEvent,
} from '../interfaces.js';

/**
 * Test double for the PaymentGateway seam — the suite never needs Stripe keys
 * or network (docs/specs/payments.md §9). "Webhooks" are JSON-encoded
 * VerifiedWebhookEvent payloads; the signature header must be `valid-signature`.
 */
export class FakePaymentGateway implements PaymentGateway {
  readonly sessions: CreateSessionInput[] = [];
  readonly refunds: string[] = [];
  failRefund = false;

  async createCheckoutSession(input: CreateSessionInput): Promise<CheckoutSession> {
    this.sessions.push(input);
    return {
      url: `https://fake.stripe.local/pay/${input.bookingId}`,
      paymentIntentId: `pi_fake_${input.bookingId.slice(0, 8)}`,
    };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string): VerifiedWebhookEvent {
    if (signatureHeader !== 'valid-signature') throw new Error('signature mismatch');
    return JSON.parse(rawBody.toString('utf8')) as VerifiedWebhookEvent;
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<void> {
    if (this.failRefund) throw new Error('refund API down');
    this.refunds.push(paymentIntentId);
  }
}
