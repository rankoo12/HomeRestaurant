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

/** Persistence contract for reviews. */
export interface ReviewRepository {
  create(input: NewReview, db?: Queryable): Promise<Review>;
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
}
