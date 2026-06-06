import type { Queryable } from '../../db/index.js';
import type { Event, EventWithDetails, NewEvent } from '../../types/index.js';

/** Filters for the discovery listing (Phase 5 builds the API on top of this). */
export interface EventListFilters {
  status?: Event['status'];
  chefId?: string;
  cuisine?: string;
  /** Match events carrying ALL of these tag labels. */
  tags?: string[];
  maxPriceCents?: number;
}

/** Persistence contract for events, their courses, and tags. */
export interface EventRepository {
  /** Creates the event plus its courses + tags atomically (own transaction). */
  create(input: NewEvent, db?: Queryable): Promise<EventWithDetails>;
  findBySlug(slug: string, db?: Queryable): Promise<EventWithDetails | null>;
  list(filters?: EventListFilters, db?: Queryable): Promise<Event[]>;
}
