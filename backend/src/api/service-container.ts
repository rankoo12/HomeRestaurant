import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../config/env.js';
import { BookingService } from '../modules/booking/booking.service.js';
import { PostgresBookingRepository } from '../modules/booking/postgres.booking-repository.js';
import { PostgresSeatHoldRepository } from '../modules/booking/postgres.seat-hold-repository.js';
import { PostgresChefRepository } from '../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../modules/events/postgres.event-repository.js';
import { HostEventService } from '../modules/events/host-event.service.js';
import { LogNotificationService } from '../modules/notifications/log-notification.service.js';
import { PaymentService } from '../modules/payments/payment.service.js';
import {
  PostgresPaymentRepository,
  PostgresWebhookEventLedger,
} from '../modules/payments/postgres.payment-repository.js';
import { PostgresPayoutRepository } from '../modules/payments/postgres.payout-repository.js';
import { StripePaymentGateway } from '../modules/payments/stripe.gateway.js';
import type { PaymentGateway } from '../modules/payments/interfaces.js';

export interface ServiceOverrides {
  /** Test seam: inject a FakePaymentGateway (docs/specs/payments.md §9). */
  paymentGateway?: PaymentGateway;
}

/**
 * Composition root for the booking/payments/host service graph. Built once in
 * buildApp and shared by the route modules so they use the same instances
 * (all are stateless; this is about a single source of wiring, not state).
 */
export function buildServiceContainer(
  env: Env,
  log: FastifyBaseLogger,
  overrides: ServiceOverrides = {},
) {
  const events = new PostgresEventRepository();
  const bookings = new PostgresBookingRepository();
  const holds = new PostgresSeatHoldRepository();
  const payments = new PostgresPaymentRepository();
  const payouts = new PostgresPayoutRepository();
  const ledger = new PostgresWebhookEventLedger();
  const chefs = new PostgresChefRepository();

  const notifier = new LogNotificationService((payload, message) => log.info(payload, message));
  const bookingService = new BookingService(events, bookings, holds, env.SERVICE_FEE_RATE);

  const gateway =
    overrides.paymentGateway ??
    (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
      ? new StripePaymentGateway(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)
      : null);
  const paymentService = gateway
    ? new PaymentService(
        gateway,
        payments,
        ledger,
        bookings,
        holds,
        events,
        payouts,
        bookingService,
        notifier,
        env.CHECKOUT_RESULT_BASE_URL ?? env.CORS_ORIGIN,
      )
    : null;

  const hostEventService = new HostEventService(
    events,
    bookings,
    holds,
    chefs,
    payouts,
    notifier,
    paymentService,
  );

  return {
    events,
    bookings,
    holds,
    payments,
    payouts,
    chefs,
    notifier,
    gateway,
    bookingService,
    paymentService,
    hostEventService,
  };
}

export type ServiceContainer = ReturnType<typeof buildServiceContainer>;
