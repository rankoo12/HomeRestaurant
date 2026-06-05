import type { Queryable } from '../../db/index.js';
import type {
  ChefBadge,
  ChefProfile,
  ChefProfileWithStats,
  NewChefProfile,
} from '../../types/index.js';

/** Persistence contract for chef profiles, badges, and derived stats. */
export interface ChefRepository {
  create(input: NewChefProfile, db?: Queryable): Promise<ChefProfile>;
  findByUserId(userId: string, db?: Queryable): Promise<ChefProfile | null>;
  /** Profile joined with derived `chef_stats` (rating, counts) — null if no such chef. */
  findBySlugWithStats(slug: string, db?: Queryable): Promise<ChefProfileWithStats | null>;
  addBadge(chefId: string, label: string, db?: Queryable): Promise<ChefBadge>;
  listBadges(chefId: string, db?: Queryable): Promise<ChefBadge[]>;
}
