import type { VerificationStatus } from './enums.js';

/** A host's profile (1:1 with a host user). Mirrors `chef_profiles`. */
export interface ChefProfile {
  userId: string;
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  coverSeed: number;
  isSuperhost: boolean;
  verificationStatus: VerificationStatus;
  hostingSince: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewChefProfile {
  userId: string;
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  coverSeed?: number;
  isSuperhost?: boolean;
  verificationStatus?: VerificationStatus;
  hostingSince?: number | null;
}

/** Derived aggregates from the `chef_stats` view — never stored, always live. */
export interface ChefStats {
  chefId: string;
  rating: number;
  reviewCount: number;
  dinnersHosted: number;
}

/** A chef profile joined with its derived stats — the shape profile screens need. */
export interface ChefProfileWithStats extends ChefProfile {
  stats: ChefStats;
}

export interface ChefBadge {
  id: string;
  chefId: string;
  label: string;
}
