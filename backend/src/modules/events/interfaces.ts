import type { Queryable } from '../../db/index.js';
import type { Event, EventCourse, EventStatus, EventWithDetails, NewEvent } from '../../types/index.js';

/** Host-editable fields (events spec §5 mutability matrix is service-enforced). */
export interface EventUpdate {
  title?: string;
  cuisine?: string;
  shortDescription?: string;
  neighborhood?: string;
  startsAt?: Date;
  durationMinutes?: number;
  priceCents?: number;
  seatsTotal?: number;
  imageSeed?: number;
  /** Full replacement when provided. */
  courses?: Array<Omit<EventCourse, 'id' | 'eventId'>>;
  tags?: string[];
}

/** A host's event row + live commitment counts (for the list + guards). */
export interface HostEventListItem extends Event {
  liveHeldSeats: number;
  confirmedBookings: number;
}

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
  /** Search-bar "Where": substring match on event neighborhood or chef city. */
  where?: string;
  /** Search-bar "When": only events starting on this date (YYYY-MM-DD, UTC). */
  date?: string;
  /** Search-bar "Seats": only events with at least this many seats left. */
  minSeats?: number;
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
  findById(id: string, db?: Queryable): Promise<Event | null>;
  /**
   * Row-locked read (`SELECT … FOR UPDATE`) — the serialization point of the
   * booking transaction (docs/specs/booking-and-concurrency.md §6/§7). Only
   * meaningful inside a transaction; callers MUST pass the tx client.
   */
  findByIdForUpdate(id: string, db: Queryable): Promise<Event | null>;
  /**
   * Adjust confirmed seats (+delta on confirm, −delta on refund). The events
   * CHECK (`0 ≤ seats_booked ≤ seats_total`) is the schema floor under this.
   */
  incrementSeatsBooked(id: string, delta: number, db: Queryable): Promise<void>;
  list(filters?: EventListFilters, db?: Queryable): Promise<Event[]>;
  /**
   * Discovery listing: chef-joined list items + total count, with sort and
   * pagination. Single query (no N+1) for the cards. See
   * docs/specs/discovery/01-events-read-api.md.
   */
  listForDiscovery(query: DiscoveryQuery, db?: Queryable): Promise<DiscoveryResult>;
  // --- Phase 7 write side (docs/specs/events.md) ---
  findByIdWithDetails(id: string, db?: Queryable): Promise<EventWithDetails | null>;
  /** Field update; replaces courses/tags entirely when provided. */
  update(id: string, fields: EventUpdate, db?: Queryable): Promise<EventWithDetails>;
  updateStatus(id: string, status: EventStatus, db?: Queryable): Promise<Event>;
  /** The chef's own events (all statuses) + live commitment counts. */
  listByChef(chefId: string, db?: Queryable): Promise<HostEventListItem[]>;
  /** Sweep: `published` whose end time passed → `completed`. Returns count. */
  completePastEvents(db?: Queryable): Promise<number>;
  /**
   * Suspension side-effect (admin spec §4): every `published` event for the
   * chef → `unpublished` (no new bookings; existing bookings stay valid).
   * Returns the number of events unpublished.
   */
  unpublishAllForChef(chefId: string, db?: Queryable): Promise<number>;
}
