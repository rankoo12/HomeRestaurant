import type { Queryable } from '../../db/index.js';
import type { NewUser, User } from '../../types/index.js';

/**
 * Persistence contract for users. Implementations depend on this, callers
 * depend on this — not on the Postgres class (SOLID DIP).
 *
 * Every method takes an optional `Queryable` so it can run inside a caller's
 * transaction (defaults to the pool for standalone use).
 */
export interface UserRepository {
  create(input: NewUser, db?: Queryable): Promise<User>;
  findById(id: string, db?: Queryable): Promise<User | null>;
  findByEmail(email: string, db?: Queryable): Promise<User | null>;
  /**
   * Login-only: returns the user plus the password hash. The hash is kept out
   * of the `User` domain type so it can't leak through ordinary reads; this is
   * the single sanctioned way to obtain it, used by the auth service.
   */
  findByEmailWithHash(
    email: string,
    db?: Queryable,
  ): Promise<{ user: User; passwordHash: string | null } | null>;
}
