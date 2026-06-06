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

export type EventSort = 'soonest' | 'price' | 'top-rated';

export interface DiscoveryQuery extends EventListFilters {
  sort?: EventSort;
  limit?: number;
  offset?: number;
}

/** A list row joined with the chef summary — feeds the discovery cards. */
export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  neighborhood: string;
  startsAt: Date;
  priceCents: number;
  seatsTotal: number;
  seatsLeft: number;
  imageSeed: number;
  chef: {
    slug: string;
    name: string;
    avatarSeed: number;
    rating: number;
    isSuperhost: boolean;
  };
}

export interface DiscoveryResult {
  items: EventListItem[];
  total: number;
}

/** Persistence contract for events, their courses, and tags. */
export interface EventRepository {
  /** Creates the event plus its courses + tags atomically (own transaction). */
  create(input: NewEvent, db?: Queryable): Promise<EventWithDetails>;
  findBySlug(slug: string, db?: Queryable): Promise<EventWithDetails | null>;
  list(filters?: EventListFilters, db?: Queryable): Promise<Event[]>;
  /**
   * Discovery listing: chef-joined list items + total count, with sort and
   * pagination. Single query (no N+1) for the cards. See
   * docs/specs/discovery/01-events-read-api.md.
   */
  listForDiscovery(query: DiscoveryQuery, db?: Queryable): Promise<DiscoveryResult>;
}
