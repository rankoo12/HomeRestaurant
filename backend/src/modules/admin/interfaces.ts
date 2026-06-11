import type { Queryable } from '../../db/index.js';

/**
 * Admin module contracts — Phase 8 (docs/specs/admin.md).
 *
 * Admin is a consumer of the other domains, not a new domain with its own
 * tables: the service composes the existing repositories. The only contract
 * that lives here is the cross-domain metrics reader, which has no natural
 * home in any single module.
 */

/** The /admin dashboard numbers (admin spec §4 — GET /api/admin/metrics). */
export interface AdminMetrics {
  pendingVerifications: number;
  flaggedReviews: number;
  usersByRole: { guest: number; host: number; admin: number };
  /** Confirmed bookings created in the last 30 days. */
  bookingsLast30d: number;
  /** Sum of succeeded payments in the last 30 days (refunds excluded by status). */
  grossRevenueCentsLast30d: number;
  /** Published events whose start time is still ahead. */
  upcomingPublishedEvents: number;
}

/** Cross-domain read-only queries for the admin portal. */
export interface AdminMetricsRepository {
  getMetrics(db?: Queryable): Promise<AdminMetrics>;
  /**
   * Future confirmed bookings on a chef's events — surfaced when suspending a
   * host so the admin sees what stays valid (admin spec §8).
   */
  countUpcomingConfirmedBookingsForChef(chefId: string, db?: Queryable): Promise<number>;
}

/** Structured-log seam — admin actions are logged, not audit-tabled (admin spec §1). */
export type AdminActionLogger = (payload: Record<string, unknown>, message: string) => void;
