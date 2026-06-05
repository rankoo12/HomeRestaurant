import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Env } from '../config/env.js';
import { registerHealthRoutes } from './routes/health.js';

/**
 * Builds the Fastify application. Kept separate from the server entrypoint so
 * tests can construct the app without binding a port.
 */
export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(cors, { origin: env.CORS_ORIGIN });

  await registerHealthRoutes(app);

  return app;
}
