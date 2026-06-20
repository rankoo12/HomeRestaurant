import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { authenticate } from '../middleware/auth.js';
import { loadEnv } from '../../config/env.js';
import { DemoPaymentGateway } from '../../modules/payments/demo.gateway.js';
import type { ServiceContainer } from '../service-container.js';

/**
 * Booking + payment API (Phase 6). All booking endpoints require auth;
 * confirmation is webhook-only. See docs/specs/booking-and-concurrency.md §9
 * and docs/specs/payments.md §4–§5.
 */
const holdSchema = z.object({
  eventId: z.string().uuid(),
  seats: z.number().int().min(1).max(8),
});

export async function registerBookingRoutes(
  app: FastifyInstance,
  services: ServiceContainer,
): Promise<void> {
  const { bookingService, paymentService, gateway, payments, bookings } = services;

  // Hold churn is rate limited per user (admin spec §9; inert under NODE_ENV=test).
  const abuseLimit = {
    rateLimit: { max: loadEnv().RATE_LIMIT_ABUSE_MAX, timeWindow: 60_000 },
  };
  app.post(
    '/api/bookings/hold',
    { preHandler: authenticate, config: abuseLimit },
    async (req, reply) => {
      const body = holdSchema.parse(req.body);
      const result = await bookingService.createHold(body.eventId, req.user!.sub, body.seats);
      reply.status(result.replayed ? 200 : 201);
      return {
        booking: result.booking,
        hold: { expiresAt: result.hold.expiresAt },
      };
    },
  );

  // The signed-in guest's own bookings, split into upcoming and past by event
  // date. Powers the guest dashboard.
  app.get('/api/guest/bookings', { preHandler: authenticate }, async (req) => {
    const all = await bookings.listMineWithEvent(req.user!.sub);
    const now = Date.now();
    const upcoming = all
      .filter((b) => b.eventStartsAt.getTime() >= now && b.bookingStatus !== 'cancelled')
      .sort((a, b) => a.eventStartsAt.getTime() - b.eventStartsAt.getTime());
    const past = all.filter(
      (b) => b.eventStartsAt.getTime() < now || b.bookingStatus === 'cancelled',
    );
    return { upcoming, past };
  });

  app.get('/api/bookings/:bookingId', { preHandler: authenticate }, async (req) => {
    const { bookingId } = req.params as { bookingId: string };
    const view = await bookingService.getView(
      bookingId,
      req.user!.sub,
      req.user!.role === 'admin',
    );
    const payment = await payments.findByBookingId(bookingId);
    return {
      ...view,
      payment: payment ? { status: payment.status, failureReason: payment.failureReason } : null,
    };
  });

  app.post('/api/bookings/:bookingId/cancel', { preHandler: authenticate }, async (req) => {
    const { bookingId } = req.params as { bookingId: string };
    const booking = await bookingService.cancel(
      bookingId,
      req.user!.sub,
      req.user!.role === 'admin',
    );
    return { booking };
  });

  app.post(
    '/api/bookings/:bookingId/checkout-session',
    { preHandler: authenticate },
    async (req) => {
      if (!paymentService) {
        throw new AppError(
          'INVALID_BOOKING_STATE',
          'Payments are not configured on this server (missing Stripe keys).',
        );
      }
      const { bookingId } = req.params as { bookingId: string };
      return paymentService.createCheckoutSession(
        bookingId,
        req.user!.sub,
        req.user!.role === 'admin',
      );
    },
  );

  // Demo-only: simulate paying / declining the hosted checkout. Drives the SAME
  // PaymentService.handleWebhook path a real Stripe delivery would, so booking
  // confirmation/refund logic is genuinely exercised — just without Stripe or a
  // charge. Guarded by PAYMENTS_DEMO_MODE + auth + booking ownership.
  if (loadEnv().PAYMENTS_DEMO_MODE === 'true') {
    const demoSchema = z.object({ outcome: z.enum(['succeeded', 'failed']) });
    app.post(
      '/api/bookings/:bookingId/demo-pay',
      { preHandler: authenticate },
      async (req) => {
        if (!paymentService || !(gateway instanceof DemoPaymentGateway)) {
          throw new AppError('INVALID_BOOKING_STATE', 'Demo payments are not active.');
        }
        const { bookingId } = req.params as { bookingId: string };
        const { outcome } = demoSchema.parse(req.body);

        // Ownership check (admins allowed) — mirrors the booking endpoints.
        const view = await bookingService.getView(bookingId, req.user!.sub, req.user!.role === 'admin');
        const paymentIntentId = `pi_demo_${bookingId.slice(0, 8)}`;
        const event = gateway.verifyWebhook(
          DemoPaymentGateway.buildEventBody(outcome, bookingId, paymentIntentId),
        );
        const result = await paymentService.handleWebhook(event);
        return { ok: true, outcome: result, bookingStatus: view.booking.status };
      },
    );
  }

  // Stripe webhook — public (signature IS the auth), raw body for verification.
  // Registered in an encapsulated scope so the buffer parser applies only here.
  await app.register(async (scope) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => done(null, body),
    );

    scope.post('/api/payments/webhook', async (req, reply) => {
      if (!gateway || !paymentService) {
        return reply.status(503).send({ error: { code: 'INTERNAL', message: 'Payments not configured' } });
      }
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Missing signature' } });
      }

      let event;
      try {
        event = gateway.verifyWebhook(req.body as Buffer, signature);
      } catch {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid signature' } });
      }

      // 5xx on processing failure → Stripe retries; ledger ensures exactly-once.
      const outcome = await paymentService.handleWebhook(event);
      return reply.status(200).send({ received: true, outcome });
    });
  });
}
