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
}
