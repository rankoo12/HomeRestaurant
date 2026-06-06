import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewReview, Review } from '../../types/index.js';
import type { ReviewRepository } from './interfaces.js';

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
}
