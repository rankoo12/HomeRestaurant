import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { NewPayment, Payment, PaymentStatus } from '../../types/index.js';
import type { PaymentRepository, WebhookEventLedger } from './interfaces.js';

interface PaymentRow {
  id: string;
  booking_id: string;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresPaymentRepository implements PaymentRepository {
  async upsertForBooking(input: NewPayment, db: Queryable = getPool()): Promise<Payment> {
    // One payments row per booking (unique booking_id). A checkout retry
    // resets the row to a fresh pending charge instead of inserting a second.
    const { rows } = await db.query<PaymentRow>(
      `INSERT INTO payments (booking_id, status, amount_cents, currency, stripe_payment_intent_id)
       VALUES ($1, 'pending', $2, COALESCE($3, 'usd'), $4)
       ON CONFLICT (booking_id) DO UPDATE
         SET status = 'pending',
             amount_cents = EXCLUDED.amount_cents,
             stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
             failure_reason = NULL
       RETURNING *`,
      [input.bookingId, input.amountCents, input.currency ?? null, input.stripePaymentIntentId ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error('payments UPSERT returned no row');
    return mapRow(row);
  }

  async findByBookingId(bookingId: string, db: Queryable = getPool()): Promise<Payment | null> {
    const { rows } = await db.query<PaymentRow>(
      'SELECT * FROM payments WHERE booking_id = $1',
      [bookingId],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    failureReason: string | null = null,
    db: Queryable = getPool(),
  ): Promise<Payment> {
    const { rows } = await db.query<PaymentRow>(
      `UPDATE payments SET status = $2, failure_reason = COALESCE($3, failure_reason)
       WHERE id = $1 RETURNING *`,
      [id, status, failureReason],
    );
    const row = rows[0];
    if (!row) throw new Error(`payments UPDATE: no row for id ${id}`);
    return mapRow(row);
  }
}

export class PostgresWebhookEventLedger implements WebhookEventLedger {
  async recordOnce(eventId: string, type: string, db: Queryable): Promise<boolean> {
    const { rowCount } = await db.query(
      `INSERT INTO stripe_webhook_events (id, type) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [eventId, type],
    );
    return (rowCount ?? 0) > 0;
  }
}
