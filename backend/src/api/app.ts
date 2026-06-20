import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import { AppError } from '../types/index.js';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerRbacProbeRoutes } from './routes/rbac-probe.js';
import { registerEventRoutes } from './routes/events.js';
import { registerChefRoutes } from './routes/chefs.js';
import { registerBookingRoutes } from './routes/bookings.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerHostEventRoutes } from './routes/host-events.js';
import { registerReviewRoutes } from './routes/reviews.js';
import { registerAdminRoutes } from './routes/admin.js';
import { buildServiceContainer, type ServiceOverrides } from './service-container.js';

/** Rate limiting is on by default outside tests; env can force either way (admin spec §9). */
export function rateLimitEnabled(env: Env): boolean {
  if (env.RATE_LIMIT_ENABLED !== undefined) return env.RATE_LIMIT_ENABLED === 'true';
  return env.NODE_ENV !== 'test';
}

/**
 * Builds the Fastify application. Kept separate from the server entrypoint so
 * tests can construct the app without binding a port. `overrides` is the test
 * seam for the payment gateway (docs/specs/payments.md §9).
 */
export async function buildApp(
  env: Env,
  overrides: ServiceOverrides = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(cookie);
  // Security headers (admin spec §9). CSP report-only: the API serves JSON;
  // the Next app owns its own pages and headers.
  await app.register(helmet, {
    contentSecurityPolicy: { useDefaults: true, reportOnly: true },
  });

  if (rateLimitEnabled(env)) {
    await app.register(rateLimit, {
      global: true,
      max: env.RATE_LIMIT_GLOBAL_MAX, // generous backstop (admin spec §9)
      timeWindow: 60_000,
      // Authed traffic is keyed per token (per-user in practice); anonymous per IP.
      keyGenerator: (req) => req.headers.authorization ?? req.ip,
      // The plugin throws this value — an AppError lands in the central error
      // handler and serializes as the standard `{ error: { code, message } }`.
      errorResponseBuilder: (_req, context) =>
        new AppError('RATE_LIMITED', `Too many requests — try again in ${context.after}`),
    });
  }

  registerErrorHandler(app);

  const services = buildServiceContainer(env, app.log, overrides);

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerRbacProbeRoutes(app);
  await registerEventRoutes(app);
  await registerChefRoutes(app);
  await registerBookingRoutes(app, services);
  await registerOnboardingRoutes(app);
  await registerHostEventRoutes(app, services);
  await registerReviewRoutes(app);
  await registerAdminRoutes(app, services);

  return app;
}
