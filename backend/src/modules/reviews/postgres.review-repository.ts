import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewReview, Review } from '../../types/index.js';
import type {
  FlaggedReview,
  ReviewRepository,
  ReviewWithAuthor,
  ReviewableBooking,
} from './interfaces.js';

interface ReviewRow {
  id: string;
  event_id: string;
  chef_id: string;
  author_id: string;
  rating: number;
  body: string;
  is_flagged: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: ReviewRow): Review {
  return {
    id: row.id,
    eventId: row.event_id,
    chefId: row.chef_id,
    authorId: row.author_id,
    rating: row.rating,
    body: row.body,
    isFlagged: row.is_flagged,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresReviewRepository implements ReviewRepository {
  async create(input: NewReview, db: Queryable = getPool()): Promise<Review> {
    const { rows } = await db.query<ReviewRow>(
      `INSERT INTO reviews (event_id, chef_id, author_id, rating, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.eventId, input.chefId, input.authorId, input.rating, input.body],
    );
    const row = rows[0];
    if (!row) throw new Error('reviews INSERT returned no row');
    return mapRow(row);
  }

  async findById(id: string, db: Queryable = getPool()): Promise<Review | null> {
    const { rows } = await db.query<ReviewRow>('SELECT * FROM reviews WHERE id = $1', [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByEventAndAuthor(
    eventId: string,
    authorId: string,
    db: Queryable = getPool(),
  ): Promise<Review | null> {
    const { rows } = await db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE event_id = $1 AND author_id = $2',
      [eventId, authorId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async setFlagged(id: string, flagged: boolean, db: Queryable = getPool()): Promise<void> {
    await db.query('UPDATE reviews SET is_flagged = $2 WHERE id = $1', [id, flagged]);
  }

  async listFlagged(db: Queryable = getPool()): Promise<FlaggedReview[]> {
    // Reviews are immutable except for the flag bit, so the updated_at trigger
    // timestamp IS the flag time — oldest flag first (reviews spec §11).
    const { rows } = await db.query<{
      id: string;
      rating: number;
      body: string;
      created_at: Date;
      updated_at: Date;
      author_name: string;
      author_avatar_seed: number;
      chef_name: string;
      chef_slug: string;
      event_title: string;
      event_slug: string;
      event_starts_at: Date;
    }>(
      `SELECT r.id, r.rating, r.body, r.created_at, r.updated_at,
              a.full_name AS author_name, a.avatar_seed AS author_avatar_seed,
              cu.full_name AS chef_name, cp.slug AS chef_slug,
              e.title AS event_title, e.slug AS event_slug, e.starts_at AS event_starts_at
         FROM reviews r
         JOIN users a ON a.id = r.author_id
         JOIN chef_profiles cp ON cp.user_id = r.chef_id
         JOIN users cu ON cu.id = r.chef_id
         JOIN events e ON e.id = r.event_id
        WHERE r.is_flagged = true
        ORDER BY r.updated_at ASC`,
    );
    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      createdAt: row.created_at,
      flaggedAt: row.updated_at,
      author: { name: row.author_name, avatarSeed: row.author_avatar_seed },
      chef: { name: row.chef_name, slug: row.chef_slug },
      event: { title: row.event_title, slug: row.event_slug, startsAt: row.event_starts_at },
    }));
  }

  async delete(id: string, db: Queryable = getPool()): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM reviews WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async listReviewableBookings(
    guestId: string,
    db: Queryable = getPool(),
  ): Promise<ReviewableBooking[]> {
    const { rows } = await db.query<{
      booking_id: string;
      event_id: string;
      event_title: string;
      event_slug: string;
      starts_at: Date;
    }>(
      `SELECT b.id AS booking_id, e.id AS event_id, e.title AS event_title,
              e.slug AS event_slug, e.starts_at
         FROM bookings b
         JOIN events e ON e.id = b.event_id
        WHERE b.guest_id = $1
          AND b.status = 'confirmed'
          AND e.status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM reviews r WHERE r.event_id = e.id AND r.author_id = $1
          )
        ORDER BY e.starts_at DESC`,
      [guestId],
    );
    return rows.map((r) => ({
      bookingId: r.booking_id,
      eventId: r.event_id,
      eventTitle: r.event_title,
      eventSlug: r.event_slug,
      startsAt: r.starts_at,
    }));
  }

  async listByChef(chefId: string, db: Queryable = getPool()): Promise<Review[]> {
    const { rows } = await db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE chef_id = $1 ORDER BY created_at DESC',
      [chefId],
    );
    return rows.map(mapRow);
  }

  async listByEvent(eventId: string, db: Queryable = getPool()): Promise<Review[]> {
    const { rows } = await db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId],
    );
    return rows.map(mapRow);
  }

  async listByChefWithAuthor(
    chefId: string,
    limit = 20,
    db: Queryable = getPool(),
  ): Promise<ReviewWithAuthor[]> {
    const { rows } = await db.query<AuthorRow>(
      `SELECT r.id, r.rating, r.body, r.created_at,
              u.full_name AS author_name, u.avatar_seed AS author_avatar_seed
         FROM reviews r JOIN users u ON u.id = r.author_id
        WHERE r.chef_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
      [chefId, limit],
    );
    return rows.map(mapAuthorRow);
  }

  async listByEventWithAuthor(
    eventId: string,
    limit = 20,
    db: Queryable = getPool(),
  ): Promise<ReviewWithAuthor[]> {
    const { rows } = await db.query<AuthorRow>(
      `SELECT r.id, r.rating, r.body, r.created_at,
              u.full_name AS author_name, u.avatar_seed AS author_avatar_seed
         FROM reviews r JOIN users u ON u.id = r.author_id
        WHERE r.event_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
      [eventId, limit],
    );
    return rows.map(mapAuthorRow);
  }
}

interface AuthorRow {
  id: string;
  rating: number;
  body: string;
  created_at: Date;
  author_name: string;
  author_avatar_seed: number;
}

function mapAuthorRow(row: AuthorRow): ReviewWithAuthor {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
    author: { name: row.author_name, avatarSeed: row.author_avatar_seed },
  };
}
