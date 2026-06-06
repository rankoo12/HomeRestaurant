import pg from 'pg';
import { loadEnv } from '../src/config/env.js';
import { PostgresUserRepository } from '../src/modules/identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../src/modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../src/modules/events/postgres.event-repository.js';
import { PostgresReviewRepository } from '../src/modules/reviews/postgres.review-repository.js';
import { PostgresPayoutRepository } from '../src/modules/payments/postgres.payout-repository.js';
import {
  SEED_CHEFS,
  SEED_EVENTS,
  SEED_GUESTS,
  SEED_REVIEWS,
} from './seed-data.js';

/**
 * Idempotent dev seed: wipes domain tables, then reproduces the design prototype
 * (docs/design/app/data.jsx) — 4 chefs, 6 events, 4 guests, 4 reviews, demo payouts.
 * Runs inside one transaction. Not for production data.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required to seed.');

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const reviews = new PostgresReviewRepository();
  const payouts = new PostgresPayoutRepository();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean slate (CASCADE clears dependents). TRUNCATE order doesn't matter with CASCADE.
    await client.query(
      `TRUNCATE users, chef_profiles, chef_badges, chef_verifications,
                events, event_courses, event_tags,
                bookings, seat_holds, payments, payouts, reviews
       RESTART IDENTITY CASCADE`,
    );

    const chefIdBySlug = new Map<string, string>();

    // Chefs: user + profile (approved so they're publishable) + badges.
    for (const c of SEED_CHEFS) {
      const user = await users.create(
        { email: c.email, fullName: c.fullName, role: 'host', avatarSeed: c.avatarSeed },
        client,
      );
      await chefs.create(
        {
          userId: user.id,
          slug: c.slug,
          cuisine: c.cuisine,
          city: c.city,
          tagline: c.tagline,
          bio: c.bio,
          coverSeed: c.coverSeed,
          isSuperhost: c.isSuperhost,
          verificationStatus: 'approved',
          hostingSince: c.hostingSince,
        },
        client,
      );
      for (const label of c.badges) await chefs.addBadge(user.id, label, client);
      chefIdBySlug.set(c.slug, user.id);
    }

    // Events with courses + tags.
    const eventIdBySlug = new Map<string, string>();
    for (const e of SEED_EVENTS) {
      const chefId = chefIdBySlug.get(e.chefSlug);
      if (!chefId) throw new Error(`Seed event ${e.slug} references unknown chef ${e.chefSlug}`);
      const created = await events.create(
        {
          slug: e.slug,
          chefId,
          title: e.title,
          cuisine: e.cuisine,
          shortDescription: e.shortDescription,
          neighborhood: e.neighborhood,
          status: e.status,
          startsAt: new Date(e.startsAt),
          durationMinutes: e.durationMinutes,
          priceCents: e.priceCents,
          seatsTotal: e.seatsTotal,
          seatsBooked: e.seatsBooked,
          imageSeed: e.imageSeed,
          courses: e.courses,
          tags: e.tags,
        },
        client,
      );
      eventIdBySlug.set(e.slug, created.id);
    }

    // Guests.
    const guestIdByEmail = new Map<string, string>();
    for (const g of SEED_GUESTS) {
      const user = await users.create(
        { email: g.email, fullName: g.fullName, role: 'guest', avatarSeed: g.avatarSeed },
        client,
      );
      guestIdByEmail.set(g.email, user.id);
    }

    // Reviews.
    for (const r of SEED_REVIEWS) {
      const eventId = eventIdBySlug.get(r.eventSlug);
      const chefId = chefIdBySlug.get(r.chefSlug);
      const authorId = guestIdByEmail.get(r.authorEmail);
      if (!eventId || !chefId || !authorId) {
        throw new Error(`Seed review references missing entity (${r.eventSlug})`);
      }
      await reviews.create({ eventId, chefId, authorId, rating: r.rating, body: r.body }, client);
    }

    // A few paid payouts for the earnings screen (Amara).
    const amaraId = chefIdBySlug.get('amara');
    if (amaraId) {
      const demo = [
        { gross: 47600, fee: 4760 },
        { gross: 32400, fee: 3240 },
        { gross: 54400, fee: 5440 },
      ];
      for (const d of demo) {
        await payouts.create(
          {
            chefId: amaraId,
            grossCents: d.gross,
            feeCents: d.fee,
            netCents: d.gross - d.fee,
            status: 'paid',
            paidAt: new Date(),
          },
          client,
        );
      }
    }

    await client.query('COMMIT');
    console.log(
      `Seeded: ${SEED_CHEFS.length} chefs, ${SEED_EVENTS.length} events, ` +
        `${SEED_GUESTS.length} guests, ${SEED_REVIEWS.length} reviews.`,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
