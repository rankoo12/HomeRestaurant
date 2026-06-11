import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewPayout, Payout } from '../../types/index.js';
import type { AdminPayoutRow, EarningsRow, PayoutListFilters, PayoutRepository } from './interfaces.js';

interface PayoutRow {
  id: string;
  chef_id: string;
  booking_id: string | null;
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
  status: Payout['status'];
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: PayoutRow): Payout {
  return {
    id: row.id,
    chefId: row.chef_id,
    bookingId: row.booking_id,
    grossCents: row.gross_cents,
    feeCents: row.fee_cents,
    netCents: row.net_cents,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresPayoutRepository implements PayoutRepository {
  async create(input: NewPayout, db: Queryable = getPool()): Promise<Payout> {
    const { rows } = await db.query<PayoutRow>(
      `INSERT INTO payouts (chef_id, booking_id, gross_cents, fee_cents, net_cents, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::payout_status, 'pending'), $7)
       RETURNING *`,
      [
        input.chefId,
        input.bookingId ?? null,
        input.grossCents,
        input.feeCents,
        input.netCents,
        input.status ?? null,
        input.paidAt ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('payouts INSERT returned no row');
    return mapRow(row);
  }

  async listByChef(chefId: string, db: Queryable = getPool()): Promise<Payout[]> {
    const { rows } = await db.query<PayoutRow>(
      'SELECT * FROM payouts WHERE chef_id = $1 ORDER BY created_at DESC',
      [chefId],
    );
    return rows.map(mapRow);
  }

  async listForEarnings(chefId: string, db: Queryable = getPool()): Promise<EarningsRow[]> {
    const { rows } = await db.query<
      PayoutRow & {
        event_title: string | null;
        event_starts_at: Date | null;
        confirmation_code: string | null;
      }
    >(
      `SELECT p.*, e.title AS event_title, e.starts_at AS event_starts_at,
              b.confirmation_code
         FROM payouts p
         LEFT JOIN bookings b ON b.id = p.booking_id
         LEFT JOIN events e ON e.id = b.event_id
        WHERE p.chef_id = $1
        ORDER BY p.created_at DESC`,
      [chefId],
    );
    return rows.map((row) => ({
      ...mapRow(row),
      eventTitle: row.event_title,
      eventStartsAt: row.event_starts_at,
      confirmationCode: row.confirmation_code,
    }));
  }

  async markFailedByBooking(bookingId: string, db: Queryable = getPool()): Promise<void> {
    await db.query(
      `UPDATE payouts SET status = 'failed' WHERE booking_id = $1 AND status = 'pending'`,
      [bookingId],
    );
  }

  async findById(id: string, db: Queryable = getPool()): Promise<Payout | null> {
    const { rows } = await db.query<PayoutRow>('SELECT * FROM payouts WHERE id = $1', [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listAll(
    filters: PayoutListFilters = {},
    db: Queryable = getPool(),
  ): Promise<AdminPayoutRow[]> {
    const params: unknown[] = [];
    let whereSql = '';
    if (filters.status) {
      params.push(filters.status);
      whereSql = `WHERE p.status = $${params.length}::payout_status`;
    }
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const { rows } = await db.query<
      PayoutRow & {
        chef_name: string;
        event_title: string | null;
        event_starts_at: Date | null;
        confirmation_code: string | null;
      }
    >(
      `SELECT p.*, u.full_name AS chef_name,
              e.title AS event_title, e.starts_at AS event_starts_at,
              b.confirmation_code
         FROM payouts p
         JOIN users u ON u.id = p.chef_id
         LEFT JOIN bookings b ON b.id = p.booking_id
         LEFT JOIN events e ON e.id = b.event_id
        ${whereSql}
        ORDER BY p.created_at ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return rows.map((row) => ({
      ...mapRow(row),
      chefName: row.chef_name,
      eventTitle: row.event_title,
      eventStartsAt: row.event_starts_at,
      confirmationCode: row.confirmation_code,
    }));
  }

  async markPaid(id: string, db: Queryable = getPool()): Promise<Payout | null> {
    // Status-guarded UPDATE: only a pending payout transitions (admin spec §4).
    const { rows } = await db.query<PayoutRow>(
      `UPDATE payouts SET status = 'paid', paid_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
