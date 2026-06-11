import { getPool, withTransaction } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { Event, EventCourse, EventStatus, EventWithDetails, NewEvent } from '../../types/index.js';
import type {
  DiscoveryQuery,
  DiscoveryResult,
  EventListFilters,
  EventListItem,
  EventRepository,
  EventUpdate,
  HostEventListItem,
} from './interfaces.js';

interface DiscoveryRow {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  neighborhood: string;
  starts_at: Date;
  price_cents: number;
  seats_total: number;
  seats_left: number;
  image_seed: number;
  chef_slug: string;
  chef_name: string;
  chef_avatar_seed: number;
  chef_rating: string;
  chef_is_superhost: boolean;
}

interface EventRow {
  id: string;
  slug: string;
  chef_id: string;
  title: string;
  cuisine: string;
  short_description: string;
  neighborhood: string;
  status: Event['status'];
  starts_at: Date;
  duration_minutes: number;
  price_cents: number;
  seats_total: number;
  seats_booked: number;
  image_seed: number;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: EventRow): Event {
  return {
    id: row.id,
    slug: row.slug,
    chefId: row.chef_id,
    title: row.title,
    cuisine: row.cuisine,
    shortDescription: row.short_description,
    neighborhood: row.neighborhood,
    status: row.status,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    seatsTotal: row.seats_total,
    seatsBooked: row.seats_booked,
    imageSeed: row.image_seed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresEventRepository implements EventRepository {
  async create(input: NewEvent, db?: Queryable): Promise<EventWithDetails> {
    // If a caller passes their own handle we honor it; otherwise open a tx so
    // the event + courses + tags land atomically.
    const run = async (client: Queryable): Promise<EventWithDetails> => {
      const { rows } = await client.query<EventRow>(
        `INSERT INTO events
           (slug, chef_id, title, cuisine, short_description, neighborhood, status,
            starts_at, duration_minutes, price_cents, seats_total, seats_booked, image_seed)
         VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7::event_status,'draft'),
                 $8,$9,$10,$11, COALESCE($12::integer,0), COALESCE($13::integer,0))
         RETURNING *`,
        [
          input.slug,
          input.chefId,
          input.title,
          input.cuisine,
          input.shortDescription,
          input.neighborhood,
          input.status ?? null,
          input.startsAt,
          input.durationMinutes,
          input.priceCents,
          input.seatsTotal,
          input.seatsBooked ?? null,
          input.imageSeed ?? null,
        ],
      );
      const event = rows[0];
      if (!event) throw new Error('events INSERT returned no row');

      for (const course of input.courses ?? []) {
        await client.query(
          `INSERT INTO event_courses (event_id, position, name, description)
           VALUES ($1, $2, $3, $4)`,
          [event.id, course.position, course.name, course.description],
        );
      }
      for (const label of input.tags ?? []) {
        await client.query(`INSERT INTO event_tags (event_id, label) VALUES ($1, $2)`, [
          event.id,
          label,
        ]);
      }

      return this.assembleDetails(mapRow(event), client);
    };

    return db ? run(db) : withTransaction((client) => run(client));
  }

  async findBySlug(slug: string, db: Queryable = getPool()): Promise<EventWithDetails | null> {
    const { rows } = await db.query<EventRow>('SELECT * FROM events WHERE slug = $1', [slug]);
    const row = rows[0];
    if (!row) return null;
    return this.assembleDetails(mapRow(row), db);
  }

  async findById(id: string, db: Queryable = getPool()): Promise<Event | null> {
    const { rows } = await db.query<EventRow>('SELECT * FROM events WHERE id = $1', [id]);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async findByIdForUpdate(id: string, db: Queryable): Promise<Event | null> {
    const { rows } = await db.query<EventRow>('SELECT * FROM events WHERE id = $1 FOR UPDATE', [
      id,
    ]);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async incrementSeatsBooked(id: string, delta: number, db: Queryable): Promise<void> {
    await db.query('UPDATE events SET seats_booked = seats_booked + $2 WHERE id = $1', [id, delta]);
  }

  async list(filters: EventListFilters = {}, db: Queryable = getPool()): Promise<Event[]> {
    const { clauses, params } = buildEventFilters(filters, 'events');
    const sql = `SELECT * FROM events
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 ORDER BY starts_at ASC`;
    const { rows } = await db.query<EventRow>(sql, params);
    return rows.map(mapRow);
  }

  async listForDiscovery(
    query: DiscoveryQuery,
    db: Queryable = getPool(),
  ): Promise<DiscoveryResult> {
    const { clauses, params } = buildEventFilters(query, 'e');
    // Search-bar filters (discovery spec §query params) — discovery-only:
    // `where` needs the chef join (cp.city), so it can't live in buildEventFilters.
    if (query.where) {
      params.push(`%${query.where}%`);
      clauses.push(`(e.neighborhood ILIKE $${params.length} OR cp.city ILIKE $${params.length})`);
    }
    if (query.date) {
      params.push(query.date);
      clauses.push(
        `e.starts_at >= $${params.length}::date AND e.starts_at < $${params.length}::date + interval '1 day'`,
      );
    }
    if (typeof query.minSeats === 'number') {
      params.push(query.minSeats);
      clauses.push(`(e.seats_total - e.seats_booked) >= $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const orderBy =
      query.sort === 'price'
        ? 'e.price_cents ASC'
        : query.sort === 'top-rated'
          ? 's.rating DESC NULLS LAST'
          : 'e.starts_at ASC';

    const limit = query.limit ?? 24;
    const offset = query.offset ?? 0;

    const base = `
      FROM events e
      JOIN chef_profiles cp ON cp.user_id = e.chef_id
      JOIN users u ON u.id = e.chef_id
      LEFT JOIN chef_stats s ON s.chef_id = e.chef_id
      ${where}`;

    const countRes = await db.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total ${base}`,
      params,
    );
    const total = Number(countRes.rows[0]?.total ?? 0);

    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const rowsRes = await db.query<DiscoveryRow>(
      `SELECT
         e.id, e.slug, e.title, e.cuisine, e.neighborhood, e.starts_at,
         e.price_cents, e.seats_total, (e.seats_total - e.seats_booked) AS seats_left,
         e.image_seed,
         cp.slug AS chef_slug, u.full_name AS chef_name, u.avatar_seed AS chef_avatar_seed,
         COALESCE(s.rating, 0) AS chef_rating, cp.is_superhost AS chef_is_superhost
       ${base}
       ORDER BY ${orderBy}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
    );

    return { items: rowsRes.rows.map(mapDiscoveryRow), total };
  }

  async findByIdWithDetails(id: string, db: Queryable = getPool()): Promise<EventWithDetails | null> {
    const event = await this.findById(id, db);
    if (!event) return null;
    return this.assembleDetails(event, db);
  }

  async update(id: string, fields: EventUpdate, db?: Queryable): Promise<EventWithDetails> {
    const run = async (client: Queryable): Promise<EventWithDetails> => {
      const { rows } = await client.query<EventRow>(
        `UPDATE events SET
           title             = COALESCE($2, title),
           cuisine           = COALESCE($3, cuisine),
           short_description = COALESCE($4, short_description),
           neighborhood      = COALESCE($5, neighborhood),
           starts_at         = COALESCE($6, starts_at),
           duration_minutes  = COALESCE($7::integer, duration_minutes),
           price_cents       = COALESCE($8::integer, price_cents),
           seats_total       = COALESCE($9::integer, seats_total),
           image_seed        = COALESCE($10::integer, image_seed)
         WHERE id = $1 RETURNING *`,
        [
          id,
          fields.title ?? null,
          fields.cuisine ?? null,
          fields.shortDescription ?? null,
          fields.neighborhood ?? null,
          fields.startsAt ?? null,
          fields.durationMinutes ?? null,
          fields.priceCents ?? null,
          fields.seatsTotal ?? null,
          fields.imageSeed ?? null,
        ],
      );
      const row = rows[0];
      if (!row) throw new Error(`events UPDATE: no row for id ${id}`);

      if (fields.courses) {
        await client.query('DELETE FROM event_courses WHERE event_id = $1', [id]);
        for (const course of fields.courses) {
          await client.query(
            `INSERT INTO event_courses (event_id, position, name, description)
             VALUES ($1, $2, $3, $4)`,
            [id, course.position, course.name, course.description],
          );
        }
      }
      if (fields.tags) {
        await client.query('DELETE FROM event_tags WHERE event_id = $1', [id]);
        for (const label of fields.tags) {
          await client.query('INSERT INTO event_tags (event_id, label) VALUES ($1, $2)', [id, label]);
        }
      }
      return this.assembleDetails(mapRow(row), client);
    };
    return db ? run(db) : withTransaction((client) => run(client));
  }

  async updateStatus(id: string, status: EventStatus, db: Queryable = getPool()): Promise<Event> {
    const { rows } = await db.query<EventRow>(
      'UPDATE events SET status = $2 WHERE id = $1 RETURNING *',
      [id, status],
    );
    const row = rows[0];
    if (!row) throw new Error(`events status UPDATE: no row for id ${id}`);
    return mapRow(row);
  }

  async listByChef(chefId: string, db: Queryable = getPool()): Promise<HostEventListItem[]> {
    const { rows } = await db.query<
      EventRow & { live_held_seats: string; confirmed_bookings: string }
    >(
      `SELECT e.*,
              COALESCE((SELECT SUM(sh.seats) FROM seat_holds sh
                         WHERE sh.event_id = e.id AND sh.status = 'active'
                           AND sh.expires_at > now()), 0)::text AS live_held_seats,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.event_id = e.id AND b.status = 'confirmed')::text AS confirmed_bookings
         FROM events e
        WHERE e.chef_id = $1
        ORDER BY e.starts_at DESC`,
      [chefId],
    );
    return rows.map((row) => ({
      ...mapRow(row),
      liveHeldSeats: Number(row.live_held_seats),
      confirmedBookings: Number(row.confirmed_bookings),
    }));
  }

  async unpublishAllForChef(chefId: string, db: Queryable = getPool()): Promise<number> {
    const { rowCount } = await db.query(
      `UPDATE events SET status = 'unpublished'
        WHERE chef_id = $1 AND status = 'published'`,
      [chefId],
    );
    return rowCount ?? 0;
  }

  async completePastEvents(db: Queryable = getPool()): Promise<number> {
    const { rowCount } = await db.query(
      `UPDATE events SET status = 'completed'
        WHERE status = 'published'
          AND starts_at + (duration_minutes * interval '1 minute') < now()`,
    );
    return rowCount ?? 0;
  }

  /** Loads courses + tags for an event and returns the detail shape. */
  private async assembleDetails(event: Event, db: Queryable): Promise<EventWithDetails> {
    const courses = await db.query<{
      id: string;
      event_id: string;
      position: number;
      name: string;
      description: string;
    }>('SELECT * FROM event_courses WHERE event_id = $1 ORDER BY position', [event.id]);

    const tags = await db.query<{ label: string }>(
      'SELECT label FROM event_tags WHERE event_id = $1 ORDER BY label',
      [event.id],
    );

    const mappedCourses: EventCourse[] = courses.rows.map((c) => ({
      id: c.id,
      eventId: c.event_id,
      position: c.position,
      name: c.name,
      description: c.description,
    }));

    return { ...event, courses: mappedCourses, tags: tags.rows.map((t) => t.label) };
  }
}

/**
 * Builds parameterized WHERE clauses from event filters. `table` is the alias
 * to qualify columns (`events` for the plain list, `e` for the joined query).
 * The tag subquery always references the base `events` id via the alias.
 */
function buildEventFilters(
  filters: EventListFilters,
  table: string,
): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`${table}.status = $${params.length}`);
  }
  if (filters.chefId) {
    params.push(filters.chefId);
    clauses.push(`${table}.chef_id = $${params.length}`);
  }
  if (filters.cuisine) {
    params.push(filters.cuisine);
    clauses.push(`${table}.cuisine = $${params.length}`);
  }
  if (typeof filters.maxPriceCents === 'number') {
    params.push(filters.maxPriceCents);
    clauses.push(`${table}.price_cents <= $${params.length}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.push(filters.tags);
    params.push(filters.tags.length);
    clauses.push(
      `${table}.id IN (SELECT event_id FROM event_tags WHERE label = ANY($${params.length - 1}::text[])
              GROUP BY event_id HAVING COUNT(DISTINCT label) = $${params.length})`,
    );
  }

  return { clauses, params };
}

function mapDiscoveryRow(row: DiscoveryRow): EventListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cuisine: row.cuisine,
    neighborhood: row.neighborhood,
    startsAt: row.starts_at,
    priceCents: row.price_cents,
    seatsTotal: row.seats_total,
    seatsLeft: row.seats_left,
    imageSeed: row.image_seed,
    chef: {
      slug: row.chef_slug,
      name: row.chef_name,
      avatarSeed: row.chef_avatar_seed,
      rating: Number(row.chef_rating),
      isSuperhost: row.chef_is_superhost,
    },
  };
}
