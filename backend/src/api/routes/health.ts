import type { FastifyInstance } from 'fastify';

/**
 * Liveness probe. Expanded with dependency checks (DB, Redis) in later phases.
 */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'home-restaurant-backend',
    timestamp: new Date().toISOString(),
  }));
}
