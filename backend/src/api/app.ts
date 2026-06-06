import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import type { Env } from '../config/env.js';
import { registerErrorHandler } from './error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerRbacProbeRoutes } from './routes/rbac-probe.js';
import { registerEventRoutes } from './routes/events.js';
import { registerChefRoutes } from './routes/chefs.js';

/**
 * Builds the Fastify application. Kept separate from the server entrypoint so
 * tests can construct the app without binding a port.
 */
export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(cookie);

  registerErrorHandler(app);

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerRbacProbeRoutes(app);
  await registerEventRoutes(app);
  await registerChefRoutes(app);

  return app;
}
