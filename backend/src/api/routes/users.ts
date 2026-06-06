import type { FastifyInstance } from 'fastify';
import { AppError } from '../../types/index.js';
import { PostgresUserRepository } from '../../modules/identity/postgres.user-repository.js';
import { AuthService } from '../../modules/identity/auth.service.js';
import { authenticate } from '../middleware/auth.js';

/** Authenticated user routes. */
export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  const service = new AuthService(new PostgresUserRepository());

  app.get('/api/users/me', { preHandler: authenticate }, async (req) => {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
    const user = await service.me(req.user.sub);
    return { user };
  });
}
