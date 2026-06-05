import { getPool, withTransaction } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { Event, EventCourse, EventWithDetails, NewEvent } from '../../types/index.js';
import type { EventListFilters, EventRepository } from './interfaces.js';

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

  async list(filters: EventListFilters = {}, db: Queryable = getPool()): Promise<Event[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }
    if (filters.chefId) {
      params.push(filters.chefId);
      where.push(`chef_id = $${params.length}`);
    }
    if (filters.cuisine) {
      params.push(filters.cuisine);
      where.push(`cuisine = $${params.length}`);
    }
    if (typeof filters.maxPriceCents === 'number') {
      params.push(filters.maxPriceCents);
      where.push(`price_cents <= $${params.length}`);
    }
    if (filters.tags && filters.tags.length > 0) {
      params.push(filters.tags);
      params.push(filters.tags.length);
      // Event must carry every requested tag.
      where.push(
        `id IN (SELECT event_id FROM event_tags WHERE label = ANY($${params.length - 1}::text[])
                GROUP BY event_id HAVING COUNT(DISTINCT label) = $${params.length})`,
      );
    }

    const sql = `SELECT * FROM events
                 ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                 ORDER BY starts_at ASC`;
    const { rows } = await db.query<EventRow>(sql, params);
    return rows.map(mapRow);
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
