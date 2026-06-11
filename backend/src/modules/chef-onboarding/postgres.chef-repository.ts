import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type {
  ChefBadge,
  ChefProfile,
  ChefProfileUpdate,
  ChefProfileWithStats,
  ChefVerification,
  NewChefProfile,
  NewChefVerification,
  VerificationStatus,
} from '../../types/index.js';
import type { ChefRepository, PendingVerificationItem, PublicChefProfile } from './interfaces.js';

interface VerificationRow {
  id: string;
  chef_id: string;
  kind: string;
  status: VerificationStatus;
  document_ref: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  notes: string | null;
  created_at: Date;
}

function mapVerificationRow(row: VerificationRow): ChefVerification {
  return {
    id: row.id,
    chefId: row.chef_id,
    kind: row.kind,
    status: row.status,
    documentRef: row.document_ref,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

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
    // Idempotent on the UNIQUE (chef_id, label) guard — admin approval re-runs
    // must not explode (chef-onboarding spec §11).
    const { rows } = await db.query<{ id: string; chef_id: string; label: string }>(
      `INSERT INTO chef_badges (chef_id, label) VALUES ($1, $2)
       ON CONFLICT (chef_id, label) DO NOTHING
       RETURNING *`,
      [chefId, label],
    );
    const row = rows[0];
    if (row) return { id: row.id, chefId: row.chef_id, label: row.label };
    const existing = await db.query<{ id: string; chef_id: string; label: string }>(
      'SELECT * FROM chef_badges WHERE chef_id = $1 AND label = $2',
      [chefId, label],
    );
    const found = existing.rows[0];
    if (!found) throw new Error('chef_badges INSERT returned no row');
    return { id: found.id, chefId: found.chef_id, label: found.label };
  }

  async listBadges(chefId: string, db: Queryable = getPool()): Promise<ChefBadge[]> {
    const { rows } = await db.query<{ id: string; chef_id: string; label: string }>(
      'SELECT * FROM chef_badges WHERE chef_id = $1 ORDER BY label',
      [chefId],
    );
    return rows.map((r) => ({ id: r.id, chefId: r.chef_id, label: r.label }));
  }

  async updateProfile(
    userId: string,
    fields: ChefProfileUpdate,
    db: Queryable = getPool(),
  ): Promise<ChefProfile> {
    const { rows } = await db.query<ChefRow>(
      `UPDATE chef_profiles SET
         cuisine    = COALESCE($2, cuisine),
         city       = COALESCE($3, city),
         tagline    = COALESCE($4, tagline),
         bio        = COALESCE($5, bio),
         cover_seed = COALESCE($6::integer, cover_seed)
       WHERE user_id = $1 RETURNING *`,
      [
        userId,
        fields.cuisine ?? null,
        fields.city ?? null,
        fields.tagline ?? null,
        fields.bio ?? null,
        fields.coverSeed ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error(`chef_profiles UPDATE: no row for user ${userId}`);
    return mapRow(row);
  }

  async addVerification(
    input: NewChefVerification,
    db: Queryable = getPool(),
  ): Promise<ChefVerification> {
    const { rows } = await db.query<VerificationRow>(
      `INSERT INTO chef_verifications (chef_id, kind, document_ref)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.chefId, input.kind, input.documentRef ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error('chef_verifications INSERT returned no row');
    return mapVerificationRow(row);
  }

  async listVerifications(chefId: string, db: Queryable = getPool()): Promise<ChefVerification[]> {
    const { rows } = await db.query<VerificationRow>(
      'SELECT * FROM chef_verifications WHERE chef_id = $1 ORDER BY created_at DESC',
      [chefId],
    );
    return rows.map(mapVerificationRow);
  }

  async setVerificationStatus(
    userId: string,
    status: VerificationStatus,
    db: Queryable = getPool(),
  ): Promise<ChefProfile> {
    const { rows } = await db.query<ChefRow>(
      'UPDATE chef_profiles SET verification_status = $2 WHERE user_id = $1 RETURNING *',
      [userId, status],
    );
    const row = rows[0];
    if (!row) throw new Error(`chef_profiles status UPDATE: no row for user ${userId}`);
    return mapRow(row);
  }

  async listPendingVerifications(db: Queryable = getPool()): Promise<PendingVerificationItem[]> {
    const { rows } = await db.query<{
      chef_id: string;
      slug: string;
      name: string;
      email: string;
      avatar_seed: number;
      cuisine: string;
      city: string;
      tagline: string;
      bio: string;
      applied_at: Date;
    }>(
      `SELECT cp.user_id AS chef_id, cp.slug, u.full_name AS name, u.email::text AS email,
              u.avatar_seed, cp.cuisine, cp.city, cp.tagline, cp.bio,
              COALESCE(
                (SELECT MIN(v.created_at) FROM chef_verifications v
                  WHERE v.chef_id = cp.user_id AND v.status = 'pending'),
                cp.created_at
              ) AS applied_at
         FROM chef_profiles cp
         JOIN users u ON u.id = cp.user_id
        WHERE cp.verification_status = 'pending'
        ORDER BY applied_at ASC`,
    );
    if (rows.length === 0) return [];

    const chefIds = rows.map((r) => r.chef_id);
    const verifications = await db.query<VerificationRow>(
      `SELECT * FROM chef_verifications WHERE chef_id = ANY($1::uuid[])
        ORDER BY created_at DESC`,
      [chefIds],
    );
    const byChef = new Map<string, ChefVerification[]>();
    for (const v of verifications.rows) {
      const list = byChef.get(v.chef_id) ?? [];
      list.push(mapVerificationRow(v));
      byChef.set(v.chef_id, list);
    }

    return rows.map((r) => ({
      chefId: r.chef_id,
      slug: r.slug,
      name: r.name,
      email: r.email,
      avatarSeed: r.avatar_seed,
      cuisine: r.cuisine,
      city: r.city,
      tagline: r.tagline,
      bio: r.bio,
      appliedAt: r.applied_at,
      verifications: byChef.get(r.chef_id) ?? [],
    }));
  }

  async reviewPendingVerifications(
    chefId: string,
    status: VerificationStatus,
    reviewedBy: string,
    notes: string | null,
    db: Queryable = getPool(),
  ): Promise<ChefVerification[]> {
    const { rows } = await db.query<VerificationRow>(
      `UPDATE chef_verifications
          SET status = $2, reviewed_by = $3, reviewed_at = now(), notes = $4
        WHERE chef_id = $1 AND status = 'pending'
        RETURNING *`,
      [chefId, status, reviewedBy, notes],
    );
    return rows.map(mapVerificationRow);
  }

  async isSlugTaken(slug: string, db: Queryable = getPool()): Promise<boolean> {
    const { rows } = await db.query('SELECT 1 FROM chef_profiles WHERE slug = $1', [slug]);
    return rows.length > 0;
  }

  async findPublicBySlug(slug: string, db: Queryable = getPool()): Promise<PublicChefProfile | null> {
    return this.findPublic('cp.slug = $1', slug, db);
  }

  async findPublicByUserId(
    userId: string,
    db: Queryable = getPool(),
  ): Promise<PublicChefProfile | null> {
    return this.findPublic('cp.user_id = $1', userId, db);
  }

  /** Shared public-profile assembly: profile + user display + stats + badges. */
  private async findPublic(
    whereClause: string,
    param: string,
    db: Queryable,
  ): Promise<PublicChefProfile | null> {
    const { rows } = await db.query<PublicChefRow>(
      `SELECT cp.slug, u.full_name AS name, u.avatar_seed,
              cp.city, cp.cuisine, cp.tagline, cp.bio, cp.cover_seed,
              cp.is_superhost, cp.hosting_since, cp.verification_status,
              COALESCE(s.rating, 0) AS rating, COALESCE(s.review_count, 0) AS review_count,
              COALESCE(s.dinners_hosted, 0) AS dinners_hosted
         FROM chef_profiles cp
         JOIN users u ON u.id = cp.user_id
         LEFT JOIN chef_stats s ON s.chef_id = cp.user_id
        WHERE ${whereClause}`,
      [param],
    );
    const row = rows[0];
    if (!row) return null;

    const badges = await db.query<{ label: string }>(
      `SELECT cb.label FROM chef_badges cb
         JOIN chef_profiles cp ON cp.user_id = cb.chef_id
        WHERE cp.slug = $1 ORDER BY cb.label`,
      [row.slug],
    );

    return {
      slug: row.slug,
      name: row.name,
      avatarSeed: row.avatar_seed,
      city: row.city,
      cuisine: row.cuisine,
      tagline: row.tagline,
      bio: row.bio,
      coverSeed: row.cover_seed,
      isSuperhost: row.is_superhost,
      hostingSince: row.hosting_since,
      verificationStatus: row.verification_status,
      stats: {
        chefId: row.slug, // public view keys stats by slug; internal id not exposed
        rating: Number(row.rating),
        reviewCount: Number(row.review_count),
        dinnersHosted: Number(row.dinners_hosted),
      },
      badges: badges.rows.map((b) => b.label),
    };
  }
}

interface PublicChefRow {
  slug: string;
  name: string;
  avatar_seed: number;
  city: string;
  cuisine: string;
  tagline: string;
  bio: string;
  cover_seed: number;
  is_superhost: boolean;
  hosting_since: number | null;
  verification_status: ChefProfile['verificationStatus'];
  rating: string;
  review_count: string;
  dinners_hosted: string;
}
