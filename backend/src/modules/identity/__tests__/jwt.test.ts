/**
 * JWT unit tests. Sets env BEFORE importing the module under test, since the
 * config is read (and cached) at first use.
 */
process.env.JWT_SECRET = 'test-secret-at-least-16-chars-long';
process.env.ACCESS_TTL_SECONDS = '900';

const { signAccessToken, verifyAccessToken } = await import('../jwt.js');

describe('access token JWT', () => {
  it('round-trips sub and role claims', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'host' });
    const claims = verifyAccessToken(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe('host');
    expect(claims.type).toBe('access');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'guest' });
    const tampered = token.slice(0, -3) + 'xyz';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const foreign = jwt.sign({ sub: 'x', role: 'guest', type: 'access' }, 'some-other-secret');
    expect(() => verifyAccessToken(foreign)).toThrow();
  });

  it('rejects a non-access token type', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const refreshLike = jwt.sign(
      { sub: 'x', role: 'guest', type: 'refresh' },
      'test-secret-at-least-16-chars-long',
    );
    expect(() => verifyAccessToken(refreshLike)).toThrow();
  });
});
