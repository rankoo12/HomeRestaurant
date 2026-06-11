import { AppError } from '../../types/index.js';
import type { ChefProfile, Payout, Review, User, UserRole } from '../../types/index.js';
import { withTransaction } from '../../db/index.js';
import type { UserListFilters, UserListResult, UserRepository } from '../identity/interfaces.js';
import type { RefreshStore } from '../identity/refresh-store.js';
import type { ChefRepository, PendingVerificationItem } from '../chef-onboarding/interfaces.js';
import type { EventRepository } from '../events/interfaces.js';
import type {
  AdminPayoutRow,
  PayoutListFilters,
  PayoutRepository,
} from '../payments/interfaces.js';
import type { FlaggedReview, ReviewRepository } from '../reviews/interfaces.js';
import type { AdminActionLogger, AdminMetrics, AdminMetricsRepository } from './interfaces.js';

/** Badge labels granted on approval, by submitted KYC kind (onboarding spec §11). */
const BADGE_BY_KIND: Record<string, string> = {
  id_document: 'ID verified',
  food_safety_cert: 'Food-safety certified',
};

/** Outcome of an idempotent admin action: current state + whether this call changed it. */
export interface VerificationDecision {
  profile: ChefProfile;
  changed: boolean;
}

export interface SuspendResult {
  user: User;
  /** Published events flipped to unpublished by this suspension. */
  unpublishedEvents: number;
  /** Future confirmed bookings that stay valid — refunds are per-event human actions (admin spec §8). */
  upcomingConfirmedBookings: number;
}

/**
 * Admin portal orchestration — Phase 8 (docs/specs/admin.md §4/§6/§8).
 * A consumer of the other domains' repositories; admin actions are logged
 * structurally, never audit-tabled (approved scope decision).
 */
export class AdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly chefs: ChefRepository,
    private readonly events: EventRepository,
    private readonly payouts: PayoutRepository,
    private readonly reviews: ReviewRepository,
    private readonly metrics: AdminMetricsRepository,
    private readonly refreshStore: RefreshStore,
    private readonly log: AdminActionLogger,
  ) {}

  // --- Dashboard -----------------------------------------------------------

  getMetrics(): Promise<AdminMetrics> {
    return this.metrics.getMetrics();
  }

  // --- Verification queue (chef-onboarding spec §11) ------------------------

  listPendingVerifications(): Promise<PendingVerificationItem[]> {
    return this.chefs.listPendingVerifications();
  }

  /** Approve: status → approved, KYC rows stamped, badges granted. Idempotent. */
  async approveVerification(chefId: string, adminId: string): Promise<VerificationDecision> {
    const decision = await withTransaction(async (tx) => {
      const profile = await this.chefs.findByUserId(chefId, tx);
      if (!profile) throw new AppError('NOT_FOUND', 'No chef profile for that id');
      // Already actioned (two admins racing): no-op with current state (admin spec §8).
      if (profile.verificationStatus !== 'pending') return { profile, changed: false };

      const updated = await this.chefs.setVerificationStatus(chefId, 'approved', tx);
      const stamped = await this.chefs.reviewPendingVerifications(
        chefId,
        'approved',
        adminId,
        null,
        tx,
      );
      for (const kind of new Set(stamped.map((v) => v.kind))) {
        const label = BADGE_BY_KIND[kind];
        if (label) await this.chefs.addBadge(chefId, label, tx);
      }
      return { profile: updated, changed: true };
    });
    if (decision.changed) {
      this.log({ adminId, chefId, action: 'verification.approve' }, 'admin: chef approved');
    }
    return decision;
  }

  /** Reject with required notes: status → rejected, notes stored on the KYC rows. Idempotent. */
  async rejectVerification(
    chefId: string,
    adminId: string,
    notes: string,
  ): Promise<VerificationDecision> {
    const decision = await withTransaction(async (tx) => {
      const profile = await this.chefs.findByUserId(chefId, tx);
      if (!profile) throw new AppError('NOT_FOUND', 'No chef profile for that id');
      if (profile.verificationStatus !== 'pending') return { profile, changed: false };

      const updated = await this.chefs.setVerificationStatus(chefId, 'rejected', tx);
      await this.chefs.reviewPendingVerifications(chefId, 'rejected', adminId, notes, tx);
      return { profile: updated, changed: true };
    });
    if (decision.changed) {
      this.log({ adminId, chefId, action: 'verification.reject' }, 'admin: chef rejected');
    }
    return decision;
  }

  // --- User management (admin spec §4/§6/§8) --------------------------------

  listUsers(filters: UserListFilters): Promise<UserListResult> {
    return this.users.list(filters);
  }

  /**
   * Suspend: flag + revoke all refresh tokens + unpublish the host's events,
   * in one decision. Self/admin targets are rejected (admin spec §6).
   */
  async suspendUser(targetId: string, adminId: string): Promise<SuspendResult> {
    const target = await this.users.findById(targetId);
    if (!target) throw new AppError('NOT_FOUND', 'No user with that id');
    if (target.id === adminId) throw new AppError('FORBIDDEN', 'You cannot suspend yourself');
    if (target.role === 'admin') throw new AppError('FORBIDDEN', 'Admin accounts cannot be suspended');

    const { user, unpublishedEvents } = await withTransaction(async (tx) => {
      const suspended = await this.users.setSuspended(targetId, true, tx);
      const count = await this.events.unpublishAllForChef(targetId, tx);
      return { user: suspended, unpublishedEvents: count };
    });
    // Suspension is total: kill every session (≤15-min access-token tail accepted — admin spec §9).
    await this.refreshStore.revokeAllForUser(targetId);
    const upcomingConfirmedBookings =
      await this.metrics.countUpcomingConfirmedBookingsForChef(targetId);

    this.log(
      { adminId, targetId, action: 'user.suspend', unpublishedEvents, upcomingConfirmedBookings },
      'admin: user suspended',
    );
    return { user, unpublishedEvents, upcomingConfirmedBookings };
  }

  /** Unsuspend restores login only — events stay unpublished (admin spec §4). */
  async unsuspendUser(targetId: string, adminId: string): Promise<User> {
    const target = await this.users.findById(targetId);
    if (!target) throw new AppError('NOT_FOUND', 'No user with that id');
    const user = await this.users.setSuspended(targetId, false);
    this.log({ adminId, targetId, action: 'user.unsuspend' }, 'admin: user unsuspended');
    return user;
  }

  /**
   * Role change guest ⇄ host. `admin` is not grantable via API (route schema
   * rejects it); admin accounts are never re-roled (covers self-demotion).
   */
  async changeRole(
    targetId: string,
    role: Extract<UserRole, 'guest' | 'host'>,
    adminId: string,
  ): Promise<{ user: User; changed: boolean }> {
    const target = await this.users.findById(targetId);
    if (!target) throw new AppError('NOT_FOUND', 'No user with that id');
    if (target.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Admin accounts cannot be re-roled');
    }
    if (target.role === role) return { user: target, changed: false };

    if (role === 'host') {
      // The profile comes from onboarding, not from role bits (admin spec §8).
      const profile = await this.chefs.findByUserId(targetId);
      if (!profile) {
        throw new AppError(
          'INVALID_STATE',
          'Cannot promote to host: the user has no chef profile. Hosts are created through onboarding.',
        );
      }
    }
    const user = await this.users.updateRole(targetId, role);
    this.log({ adminId, targetId, action: 'user.role', role }, 'admin: user role changed');
    return { user, changed: true };
  }

  // --- Payout admin (admin spec §4) -----------------------------------------

  listPayouts(filters: PayoutListFilters): Promise<AdminPayoutRow[]> {
    return this.payouts.listAll(filters);
  }

  /** pending → paid (+paid_at). Idempotent on paid; 409 on failed. */
  async markPayoutPaid(id: string, adminId: string): Promise<{ payout: Payout; changed: boolean }> {
    const payout = await this.payouts.findById(id);
    if (!payout) throw new AppError('NOT_FOUND', 'No payout with that id');
    if (payout.status === 'paid') return { payout, changed: false };
    if (payout.status === 'failed') {
      throw new AppError('INVALID_STATE', 'Only a pending payout can be marked paid');
    }
    const updated = await this.payouts.markPaid(id);
    if (!updated) {
      // Lost a race with another admin — re-read and report the current state.
      const current = await this.payouts.findById(id);
      if (current?.status === 'paid') return { payout: current, changed: false };
      throw new AppError('INVALID_STATE', 'Only a pending payout can be marked paid');
    }
    this.log({ adminId, payoutId: id, action: 'payout.mark-paid' }, 'admin: payout marked paid');
    return { payout: updated, changed: true };
  }

  // --- Moderation (reviews spec §11) ----------------------------------------

  listFlaggedReviews(): Promise<FlaggedReview[]> {
    return this.reviews.listFlagged();
  }

  /** Dismiss the flag — the review stays exactly as it was. Idempotent. */
  async dismissFlag(reviewId: string, adminId: string): Promise<Review> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new AppError('NOT_FOUND', 'No review with that id');
    await this.reviews.setFlagged(reviewId, false);
    this.log({ adminId, reviewId, action: 'review.dismiss-flag' }, 'admin: review flag dismissed');
    return { ...review, isFlagged: false };
  }

  /** Hard delete — `chef_stats` is a derived VIEW and self-corrects (reviews spec §11). */
  async removeReview(reviewId: string, adminId: string): Promise<void> {
    const removed = await this.reviews.delete(reviewId);
    if (!removed) throw new AppError('NOT_FOUND', 'No review with that id');
    this.log({ adminId, reviewId, action: 'review.remove' }, 'admin: review removed');
  }
}
