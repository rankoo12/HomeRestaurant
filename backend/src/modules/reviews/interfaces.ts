import type { Queryable } from '../../db/index.js';
import type { NewReview, Review } from '../../types/index.js';

/** A review joined with its author's display fields (for the read API). */
export interface ReviewWithAuthor {
  id: string;
  rating: number;
  body: string;
  createdAt: Date;
  author: { name: string; avatarSeed: number };
}

/** A confirmed, completed dinner the guest hasn't reviewed yet (reviews spec §4). */
export interface ReviewableBooking {
  bookingId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  startsAt: Date;
}

/**
 * A flagged review with full moderation context — the admin decides from the
 * queue without hunting (reviews spec §11).
 */
export interface FlaggedReview {
  id: string;
  rating: number;
  body: string;
  createdAt: Date;
  flaggedAt: Date;
  author: { name: string; avatarSeed: number };
  chef: { name: string; slug: string };
  event: { title: string; slug: string; startsAt: Date };
}

/** Persistence contract for reviews. */
export interface ReviewRepository {
  create(input: NewReview, db?: Queryable): Promise<Review>;
  findById(id: string, db?: Queryable): Promise<Review | null>;
  findByEventAndAuthor(eventId: string, authorId: string, db?: Queryable): Promise<Review | null>;
  listByChef(chefId: string, db?: Queryable): Promise<Review[]>;
  listByEvent(eventId: string, db?: Queryable): Promise<Review[]>;
  /** Reviews for a chef, joined with author display fields (recent first). */
  listByChefWithAuthor(chefId: string, limit?: number, db?: Queryable): Promise<ReviewWithAuthor[]>;
  /** Reviews for an event, joined with author display fields (recent first). */
  listByEventWithAuthor(
    eventId: string,
    limit?: number,
    db?: Queryable,
  ): Promise<ReviewWithAuthor[]>;
  /** Flag primitive — boolean-only in Phase 7 (reviews spec §3). */
  setFlagged(id: string, flagged: boolean, db?: Queryable): Promise<void>;
  /** The guest-dashboard prompt list: confirmed bookings on completed events, no review yet. */
  listReviewableBookings(guestId: string, db?: Queryable): Promise<ReviewableBooking[]>;
  // --- Phase 8 moderation (reviews spec §11) ---
  /** The moderation queue: flagged reviews with context, oldest flag first. */
  listFlagged(db?: Queryable): Promise<FlaggedReview[]>;
  /**
   * Hard delete (reviews spec §11 — `chef_stats` is a VIEW, so rating/count
   * self-correct). Returns false when the review was already gone.
   */
  delete(id: string, db?: Queryable): Promise<boolean>;
}
