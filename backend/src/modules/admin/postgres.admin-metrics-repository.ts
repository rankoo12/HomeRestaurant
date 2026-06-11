import { getPool } from '../../db/index.js';
import type { Queryable } from '../../db/index.js';
import type { AdminMetrics, AdminMetricsRepository } from './interfaces.js';

export class PostgresAdminMetricsRepository implements AdminMetricsRepository {
  async getMetrics(db: Queryable = getPool()): Promise<AdminMetrics> {
    const { rows } = await db.query<{
      pending_verifications: string;
      flagged_reviews: string;
      guests: string;
      hosts: string;
      admins: string;
      bookings_30d: string;
      revenue_cents_30d: string;
      upcoming_events: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM chef_profiles WHERE verification_status = 'pending')::text
           AS pending_verifications,
         (SELECT COUNT(*) FROM reviews WHERE is_flagged)::text AS flagged_reviews,
         (SELECT COUNT(*) FROM users WHERE role = 'guest')::text AS guests,
         (SELECT COUNT(*) FROM users WHERE role = 'host')::text AS hosts,
         (SELECT COUNT(*) FROM users WHERE role = 'admin')::text AS admins,
         (SELECT COUNT(*) FROM bookings
           WHERE status = 'confirmed' AND created_at >= now() - interval '30 days')::text
           AS bookings_30d,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM payments
           WHERE status = 'succeeded' AND created_at >= now() - interval '30 days')::text
           AS revenue_cents_30d,
         (SELECT COUNT(*) FROM events
           WHERE status = 'published' AND starts_at > now())::text AS upcoming_events`,
    );
    const row = rows[0];
    if (!row) throw new Error('admin metrics SELECT returned no row');
    return {
      pendingVerifications: Number(row.pending_verifications),
      flaggedReviews: Number(row.flagged_reviews),
      usersByRole: {
        guest: Number(row.guests),
        host: Number(row.hosts),
        admin: Number(row.admins),
      },
      bookingsLast30d: Number(row.bookings_30d),
      grossRevenueCentsLast30d: Number(row.revenue_cents_30d),
      upcomingPublishedEvents: Number(row.upcoming_events),
    };
  }

  async countUpcomingConfirmedBookingsForChef(
    chefId: string,
    db: Queryable = getPool(),
  ): Promise<number> {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM bookings b
         JOIN events e ON e.id = b.event_id
        WHERE e.chef_id = $1 AND b.status = 'confirmed' AND e.starts_at > now()`,
      [chefId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
