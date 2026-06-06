import jwt from 'jsonwebtoken';
import { loadEnv } from '../../config/env.js';
import type { UserRole } from '../../types/index.js';

/**
 * Access-token (JWT) issue/verify. HS256, signed with JWT_SECRET.
 * See docs/specs/identity/02-token-and-session.md.
 */

export interface AccessTokenClaims {
  sub: string; // user id
  role: UserRole;
  type: 'access';
}

export function signAccessToken(claims: { sub: string; role: UserRole }): string {
  const env = loadEnv();
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set — cannot sign tokens.');
  return jwt.sign({ sub: claims.sub, role: claims.role, type: 'access' }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TTL_SECONDS,
  });
}

/** Verifies signature, expiry, and that this is an access (not refresh) token. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const env = loadEnv();
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set — cannot verify tokens.');
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    (decoded as { type?: unknown }).type !== 'access'
  ) {
    throw new Error('Not an access token');
  }
  const claims = decoded as jwt.JwtPayload & { role?: UserRole; type?: string };
  if (!claims.sub || !claims.role) throw new Error('Malformed access token claims');
  return { sub: claims.sub, role: claims.role, type: 'access' };
}
