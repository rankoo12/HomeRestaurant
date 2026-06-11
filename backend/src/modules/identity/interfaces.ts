import type { Queryable } from '../../db/index.js';
import type { NewUser, User, UserRole } from '../../types/index.js';

/** Directory filters for the admin user list (admin spec §4). */
export interface UserListFilters {
  /** Case-insensitive substring match on full name or email. */
  q?: string;
  role?: UserRole;
  suspended?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserListResult {
  items: User[];
  total: number;
}

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
  /**
   * Role transitions are server-decided only (e.g. guest → host inside the
   * onboarding transaction — chef-onboarding spec §4). Never driven by client
   * input.
   */
  updateRole(userId: string, role: UserRole, db?: Queryable): Promise<User>;
  /** Admin directory: search/filter + pagination (admin spec §4). Never exposes hashes. */
  list(filters?: UserListFilters, db?: Queryable): Promise<UserListResult>;
  /**
   * Suspension flag — admin-only action (admin spec §6/§9). Session revocation
   * is the service's job; this only flips the column.
   */
  setSuspended(userId: string, suspended: boolean, db?: Queryable): Promise<User>;
}
