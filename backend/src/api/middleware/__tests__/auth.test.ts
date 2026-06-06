/**
 * RBAC middleware unit tests — no DB. Uses the real JWT util to mint tokens.
 */
process.env.JWT_SECRET = 'test-secret-at-least-16-chars-long';

import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../../types/index.js';
import type { UserRole } from '../../../types/index.js';

const { authenticate, requireRole } = await import('../auth.js');
const { signAccessToken } = await import('../../../modules/identity/jwt.js');

function fakeReq(headers: Record<string, string> = {}, user?: { sub: string; role: UserRole }) {
  return { headers, user } as unknown as FastifyRequest;
}
const reply = {} as FastifyReply;

describe('authenticate', () => {
  it('populates req.user from a valid Bearer token', async () => {
    const token = signAccessToken({ sub: 'u1', role: 'guest' });
    const req = fakeReq({ authorization: `Bearer ${token}` });
    await authenticate(req, reply);
    expect(req.user).toEqual({ sub: 'u1', role: 'guest' });
  });

  it('rejects a missing Authorization header', async () => {
    await expect(authenticate(fakeReq(), reply)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects a malformed token', async () => {
    const req = fakeReq({ authorization: 'Bearer not-a-jwt' });
    await expect(authenticate(req, reply)).rejects.toBeInstanceOf(AppError);
  });
});

describe('requireRole', () => {
  it('allows a permitted role', async () => {
    const guard = requireRole('host', 'admin');
    await expect(guard(fakeReq({}, { sub: 'u', role: 'admin' }), reply)).resolves.toBeUndefined();
  });

  it('forbids a disallowed role with 403', async () => {
    const guard = requireRole('admin');
    await expect(guard(fakeReq({}, { sub: 'u', role: 'guest' }), reply)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('requires authentication first', async () => {
    const guard = requireRole('guest');
    await expect(guard(fakeReq(), reply)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
