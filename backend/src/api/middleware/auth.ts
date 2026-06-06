import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { AppError } from '../../types/index.js';
import type { UserRole } from '../../types/index.js';
import { verifyAccessToken } from '../../modules/identity/jwt.js';

/**
 * Auth + RBAC middleware. See docs/specs/identity/03-rbac.md.
 *
 * `authenticate` verifies the access JWT (forwarded by the proxy as a Bearer
 * token) and populates `req.user`. `requireRole` gates by role and must run
 * after `authenticate`.
 */

declare module 'fastify' {
  interface FastifyRequest {
    user?: { sub: string; role: UserRole };
  }
}

function bearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = bearerToken(req);
  if (!token) throw new AppError('UNAUTHENTICATED', 'Authentication required');
  try {
    const claims = verifyAccessToken(token);
    req.user = { sub: claims.sub, role: claims.role };
  } catch {
    throw new AppError('UNAUTHENTICATED', 'Invalid or expired token');
  }
}

/**
 * Returns a preHandler that allows only the given roles. Run after
 * `authenticate` (which sets req.user). A role mismatch is a 403.
 */
export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async function roleGuard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'You do not have access to this resource');
    }
  };
}
