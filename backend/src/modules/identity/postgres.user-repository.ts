import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewUser, User, UserRole } from '../../types/index.js';
import type { UserListFilters, UserListResult, UserRepository } from './interfaces.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  role: User['role'];
  full_name: string;
  phone: string | null;
  dietary_prefs: string[];
  avatar_seed: number;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    dietaryPrefs: row.dietary_prefs,
    avatarSeed: row.avatar_seed,
    isSuspended: row.is_suspended,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresUserRepository implements UserRepository {
  async create(input: NewUser, db: Queryable = getPool()): Promise<User> {
    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (email, password_hash, role, full_name, phone, dietary_prefs, avatar_seed)
       VALUES ($1, $2, COALESCE($3::user_role, 'guest'), $4, $5,
               COALESCE($6::text[], '{}'), COALESCE($7::integer, 0))
       RETURNING *`,
      [
        input.email,
        input.passwordHash ?? null,
        input.role ?? null,
        input.fullName,
        input.phone ?? null,
        input.dietaryPrefs ?? null,
        input.avatarSeed ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('users INSERT returned no row');
    return mapRow(row);
  }

  async findById(id: string, db: Queryable = getPool()): Promise<User | null> {
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByEmail(email: string, db: Queryable = getPool()): Promise<User | null> {
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByEmailWithHash(
    email: string,
    db: Queryable = getPool(),
  ): Promise<{ user: User; passwordHash: string | null } | null> {
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0];
    if (!row) return null;
    return { user: mapRow(row), passwordHash: row.password_hash };
  }

  async updateRole(userId: string, role: UserRole, db: Queryable = getPool()): Promise<User> {
    const { rows } = await db.query<UserRow>(
      'UPDATE users SET role = $2 WHERE id = $1 RETURNING *',
      [userId, role],
    );
    const row = rows[0];
    if (!row) throw new Error(`users UPDATE role: no row for id ${userId}`);
    return mapRow(row);
  }

  async list(filters: UserListFilters = {}, db: Queryable = getPool()): Promise<UserListResult> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.q) {
      params.push(`%${filters.q}%`);
      where.push(`(full_name ILIKE $${params.length} OR email::text ILIKE $${params.length})`);
    }
    if (filters.role) {
      params.push(filters.role);
      where.push(`role = $${params.length}::user_role`);
    }
    if (filters.suspended !== undefined) {
      params.push(filters.suspended);
      where.push(`is_suspended = $${params.length}`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const count = await db.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM users ${whereSql}`,
      params,
    );
    const { rows } = await db.query<UserRow>(
      `SELECT * FROM users ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return { items: rows.map(mapRow), total: Number(count.rows[0]?.total ?? 0) };
  }

  async setSuspended(
    userId: string,
    suspended: boolean,
    db: Queryable = getPool(),
  ): Promise<User> {
    const { rows } = await db.query<UserRow>(
      'UPDATE users SET is_suspended = $2 WHERE id = $1 RETURNING *',
      [userId, suspended],
    );
    const row = rows[0];
    if (!row) throw new Error(`users UPDATE is_suspended: no row for id ${userId}`);
    return mapRow(row);
  }
}
