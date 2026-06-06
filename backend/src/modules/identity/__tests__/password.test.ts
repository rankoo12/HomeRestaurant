import { hashPassword, verifyPassword } from '../password.js';

describe('password hashing', () => {
  it('hashes to an argon2id encoded string distinct from the input', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('correct horse battery');
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-pass');
    expect(await verifyPassword(hash, 's3cret-pass')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret-pass');
    expect(await verifyPassword(hash, 'wrong-pass')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await verifyPassword('not-a-real-hash', 'anything')).toBe(false);
  });

  it('produces different hashes for the same input (random salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
