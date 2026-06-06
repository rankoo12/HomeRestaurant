import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewPayout, Payout } from '../../types/index.js';
import type { PayoutRepository } from './interfaces.js';

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
}
