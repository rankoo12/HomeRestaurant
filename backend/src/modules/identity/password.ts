import argon2 from 'argon2';

/**
 * Password hashing — argon2id (OWASP first choice). Confined to the identity
 * module; the encoded hash never leaves it. See docs/specs/identity/04-password-policy.md.
 */

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed stored hash should read as "no match", not crash the request.
    return false;
  }
}
