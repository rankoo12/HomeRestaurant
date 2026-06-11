import type { FastifyInstance } from 'fastify';
import { AppError } from '../../types/index.js';
import { loadEnv } from '../../config/env.js';
import { PostgresUserRepository } from '../../modules/identity/postgres.user-repository.js';
import {
  AuthService,
  loginSchema,
  registerSchema,
} from '../../modules/identity/auth.service.js';

/**
 * Auth routes. The backend speaks tokens-in-JSON; the Next.js proxy translates
 * to/from httpOnly cookies (docs/specs/identity/02-token-and-session.md). The
 * refresh token is read from the body or the `x-refresh-token` header so the
 * proxy can forward it from the path-scoped cookie.
 */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const service = new AuthService(new PostgresUserRepository());
  const env = loadEnv();
  // Brute-force / enumeration limits (admin spec §9). The config is inert when
  // the rate-limit plugin isn't registered (NODE_ENV=test).
  const authLimit = { rateLimit: { max: env.RATE_LIMIT_AUTH_MAX, timeWindow: 60_000 } };
  const refreshLimit = { rateLimit: { max: env.RATE_LIMIT_REFRESH_MAX, timeWindow: 60_000 } };

  app.post('/api/auth/register', { config: authLimit }, async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const result = await service.register(input);
    reply.status(201).send(result);
  });

  app.post('/api/auth/login', { config: authLimit }, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const result = await service.login(input);
    reply.send(result);
  });

  app.post('/api/auth/refresh', { config: refreshLimit }, async (req, reply) => {
    const token = readRefreshToken(req.body, req.headers['x-refresh-token']);
    if (!token) throw new AppError('INVALID_REFRESH', 'No refresh token provided');
    const result = await service.refresh(token);
    reply.send(result);
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = readRefreshToken(req.body, req.headers['x-refresh-token']);
    await service.logout(token ?? undefined);
    reply.status(204).send();
  });
}

function readRefreshToken(body: unknown, header: string | string[] | undefined): string | null {
  if (typeof header === 'string' && header.length > 0) return header;
  if (body && typeof body === 'object' && 'refreshToken' in body) {
    const value = (body as { refreshToken?: unknown }).refreshToken;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}
