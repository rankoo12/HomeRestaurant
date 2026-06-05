import type { UserRole } from './enums.js';

/**
 * A user row (guest, host, or admin). Mirrors the `users` table.
 * `passwordHash` is intentionally omitted from this domain type — it never
 * leaves the identity module. Auth behavior is Phase 3.
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string | null;
  dietaryPrefs: string[];
  avatarSeed: number;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Fields needed to create a user (Phase 2 seed / Phase 3 signup). */
export interface NewUser {
  email: string;
  role?: UserRole;
  fullName: string;
  phone?: string | null;
  dietaryPrefs?: string[];
  avatarSeed?: number;
  passwordHash?: string | null;
}
