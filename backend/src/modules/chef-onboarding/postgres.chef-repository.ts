import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type {
  ChefBadge,
  ChefProfile,
  ChefProfileWithStats,
  NewChefProfile,
} from '../../types/index.js';
import type { ChefRepository } from './interfaces.js';

interface ChefRow {
  user_id: string;
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  cover_seed: number;
  is_superhost: boolean;
  verification_status: ChefProfile['verificationStatus'];
  hosting_since: number | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: ChefRow): ChefProfile {
  return {
    userId: row.user_id,
    slug: row.slug,
    cuisine: row.cuisine,
    city: row.city,
    tagline: row.tagline,
    bio: row.bio,
    coverSeed: row.cover_seed,
    isSuperhost: row.is_superhost,
    verificationStatus: row.verification_status,
    hostingSince: row.hosting_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresChefRepository implements ChefRepository {
  async create(input: NewChefProfile, db: Queryable = getPool()): Promise<ChefProfile> {
    const { rows } = await db.query<ChefRow>(
      `INSERT INTO chef_profiles
         (user_id, slug, cuisine, city, tagline, bio, cover_seed, is_superhost, verification_status, hosting_since)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::integer, 0), COALESCE($8::boolean, false),
               COALESCE($9::verification_status, 'pending'), $10)
       RETURNING *`,
      [
        input.userId,
        input.slug,
        input.cuisine,
        input.city,
        input.tagline,
        input.bio,
        input.coverSeed ?? null,
        input.isSuperhost ?? null,
        input.verificationStatus ?? null,
        input.hostingSince ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('chef_profiles INSERT returned no row');
    return mapRow(row);
  }

  async findByUserId(userId: string, db: Queryable = getPool()): Promise<ChefProfile | null> {
    const { rows } = await db.query<ChefRow>('SELECT * FROM chef_profiles WHERE user_id = $1', [
      userId,
    ]);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async findBySlugWithStats(
    slug: string,
    db: Queryable = getPool(),
  ): Promise<ChefProfileWithStats | null> {
    const { rows } = await db.query<ChefRow & { rating: string; review_count: string; dinners_hosted: string }>(
      `SELECT cp.*, s.rating, s.review_count, s.dinners_hosted
         FROM chef_profiles cp
         JOIN chef_stats s ON s.chef_id = cp.user_id
        WHERE cp.slug = $1`,
      [slug],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...mapRow(row),
      stats: {
        chefId: row.user_id,
        rating: Number(row.rating),
        reviewCount: Number(row.review_count),
        dinnersHosted: Number(row.dinners_hosted),
      },
    };
  }

  async addBadge(chefId: string, label: string, db: Queryable = getPool()): Promise<ChefBadge> {
    const { rows } = await db.query<{ id: string; chef_id: string; label: string }>(
      `INSERT INTO chef_badges (chef_id, label) VALUES ($1, $2) RETURNING *`,
      [chefId, label],
    );
    const row = rows[0];
    if (!row) throw new Error('chef_badges INSERT returned no row');
    return { id: row.id, chefId: row.chef_id, label: row.label };
  }

  async listBadges(chefId: string, db: Queryable = getPool()): Promise<ChefBadge[]> {
    const { rows } = await db.query<{ id: string; chef_id: string; label: string }>(
      'SELECT * FROM chef_badges WHERE chef_id = $1 ORDER BY label',
      [chefId],
    );
    return rows.map((r) => ({ id: r.id, chefId: r.chef_id, label: r.label }));
  }
}
