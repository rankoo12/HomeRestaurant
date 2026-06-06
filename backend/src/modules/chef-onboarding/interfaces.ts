import type { Queryable } from '../../db/index.js';
import type {
  ChefBadge,
  ChefProfile,
  ChefProfileWithStats,
  ChefStats,
  NewChefProfile,
} from '../../types/index.js';

/**
 * The public-facing chef view: profile + the user's display fields + derived
 * stats + badge labels. Serves both the chef page and the event-detail chef
 * block. See docs/specs/discovery/02-chef-read-api.md.
 */
export interface PublicChefProfile {
  slug: string;
  name: string;
  avatarSeed: number;
  city: string;
  cuisine: string;
  tagline: string;
  bio: string;
  coverSeed: number;
  isSuperhost: boolean;
  hostingSince: number | null;
  verificationStatus: ChefProfile['verificationStatus'];
  stats: ChefStats;
  badges: string[];
}

/** Persistence contract for chef profiles, badges, and derived stats. */
export interface ChefRepository {
  create(input: NewChefProfile, db?: Queryable): Promise<ChefProfile>;
  findByUserId(userId: string, db?: Queryable): Promise<ChefProfile | null>;
  /** Profile joined with derived `chef_stats` (rating, counts) — null if no such chef. */
  findBySlugWithStats(slug: string, db?: Queryable): Promise<ChefProfileWithStats | null>;
  addBadge(chefId: string, label: string, db?: Queryable): Promise<ChefBadge>;
  listBadges(chefId: string, db?: Queryable): Promise<ChefBadge[]>;
  /** Public chef view by slug (profile + user display + stats + badges). */
  findPublicBySlug(slug: string, db?: Queryable): Promise<PublicChefProfile | null>;
  /** Public chef view by the chef's user id (for the event-detail chef block). */
  findPublicByUserId(userId: string, db?: Queryable): Promise<PublicChefProfile | null>;
}
