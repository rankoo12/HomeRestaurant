import type { Queryable } from '../../db/index.js';
import type { NewReview, Review } from '../../types/index.js';

/** Persistence contract for reviews. */
export interface ReviewRepository {
  create(input: NewReview, db?: Queryable): Promise<Review>;
  listByChef(chefId: string, db?: Queryable): Promise<Review[]>;
  listByEvent(eventId: string, db?: Queryable): Promise<Review[]>;
}
