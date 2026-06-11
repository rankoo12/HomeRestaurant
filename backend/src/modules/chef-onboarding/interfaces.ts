import type { Queryable } from '../../db/index.js';
import type {
  ChefBadge,
  ChefProfile,
  ChefProfileUpdate,
  ChefProfileWithStats,
  ChefStats,
  ChefVerification,
  NewChefProfile,
  NewChefVerification,
  VerificationStatus,
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

/**
 * One pending application in the admin verification queue: profile + user
 * display fields + the full KYC history (resubmissions visible as multiple
 * rows). See chef-onboarding spec §11.
 */
export interface PendingVerificationItem {
  chefId: string;
  slug: string;
  name: string;
  email: string;
  avatarSeed: number;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  /** Oldest still-pending KYC row — the queue's fairness sort key. */
  appliedAt: Date;
  verifications: ChefVerification[];
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
  /** Host-editable fields only — never role/superhost/status (onboarding spec §5). */
  updateProfile(userId: string, fields: ChefProfileUpdate, db?: Queryable): Promise<ChefProfile>;
  /** Appends a KYC submission to the audit trail (chef_verifications). */
  addVerification(input: NewChefVerification, db?: Queryable): Promise<ChefVerification>;
  listVerifications(chefId: string, db?: Queryable): Promise<ChefVerification[]>;
  /** Profile-level status transition (host resubmit → pending; admin actions are Phase 8). */
  setVerificationStatus(
    userId: string,
    status: VerificationStatus,
    db?: Queryable,
  ): Promise<ChefProfile>;
  isSlugTaken(slug: string, db?: Queryable): Promise<boolean>;
  // --- Phase 8 admin verification queue (chef-onboarding spec §11) ---
  /** Pending applications, oldest first (fairness — resubmits re-queue at the back). */
  listPendingVerifications(db?: Queryable): Promise<PendingVerificationItem[]>;
  /**
   * Stamps every still-pending KYC row for the chef with the admin decision:
   * status + reviewed_by + reviewed_at(now) + notes. Returns the stamped rows.
   */
  reviewPendingVerifications(
    chefId: string,
    status: VerificationStatus,
    reviewedBy: string,
    notes: string | null,
    db?: Queryable,
  ): Promise<ChefVerification[]>;
}
