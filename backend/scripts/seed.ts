import pg from 'pg';
import { deflateSync } from 'node:zlib';
import { loadEnv } from '../src/config/env.js';
import { hashPassword } from '../src/modules/identity/password.js';
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
 * (docs/design/app/data.jsx) — 4 chefs, 6 events, 4 guests, 4 reviews, demo payouts,
 * plus one admin (seed/DB is the ONLY way an admin exists — admin spec §6).
 * Every seeded user gets the demo password below so flows are demoable.
 * Runs inside one transaction. Not for production data.
 */
const DEMO_PASSWORD = 'Demo1234'; // documented in backend/README.md — dev seed only

// Warm palette to give each seeded event a real (if simple) stored photo, so
// "every event has at least one photo" holds without embedding huge blobs.
const SEED_COLORS: ReadonlyArray<[number, number, number]> = [
  [194, 90, 51], // terracotta
  [162, 63, 28], // burnt sienna
  [94, 122, 71], // olive
  [123, 45, 42], // wine
  [197, 136, 42], // amber
  [108, 87, 64], // taupe
];

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Build a tiny solid-color PNG as a base64 data URL (an actual image, not a gradient div). */
function solidPng([r, g, b]: [number, number, number], size = 24): string {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: size }, () => Buffer.from([r, g, b])))]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const png = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Shift the authored seed dates so they're always upcoming relative to "now"
 * (the prototype dates are fixed in June 2026 and go stale). We preserve the
 * relative spacing: the earliest authored event is anchored 3 days from now,
 * and every other event keeps its original offset from that earliest date.
 */
const EARLIEST_AUTHORED = Math.min(...SEED_EVENTS.map((e) => new Date(e.startsAt).getTime()));
const ANCHOR_OFFSET_MS = 3 * 24 * 60 * 60 * 1000; // first dinner ~3 days out

function shiftToUpcoming(authoredIso: string): Date {
  const offsetFromEarliest = new Date(authoredIso).getTime() - EARLIEST_AUTHORED;
  return new Date(Date.now() + ANCHOR_OFFSET_MS + offsetFromEarliest);
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required to seed.');

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const reviews = new PostgresReviewRepository();
  const payouts = new PostgresPayoutRepository();

  // One hash, reused — argon2 per-user would slow the seed for no gain.
  const passwordHash = await hashPassword(DEMO_PASSWORD);

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
        { email: c.email, fullName: c.fullName, role: 'host', avatarSeed: c.avatarSeed, passwordHash },
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
          addressLine: e.addressLine,
          latitude: e.latitude,
          longitude: e.longitude,
          status: e.status,
          startsAt: shiftToUpcoming(e.startsAt),
          durationMinutes: e.durationMinutes,
          priceCents: e.priceCents,
          seatsTotal: e.seatsTotal,
          seatsBooked: e.seatsBooked,
          imageSeed: e.imageSeed,
          photos: [solidPng(SEED_COLORS[e.imageSeed % SEED_COLORS.length]!)],
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
        { email: g.email, fullName: g.fullName, role: 'guest', avatarSeed: g.avatarSeed, passwordHash },
        client,
      );
      guestIdByEmail.set(g.email, user.id);
    }

    // The platform admin — seed/DB only, never via API (admin spec §6/§11).
    await users.create(
      {
        email: 'admin@homerestaurant.test',
        fullName: 'Platform Admin',
        role: 'admin',
        avatarSeed: 7,
        passwordHash,
      },
      client,
    );

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
        `${SEED_GUESTS.length} guests, ${SEED_REVIEWS.length} reviews, 1 admin.`,
    );
    console.log(`Demo login: any seeded email (e.g. admin@homerestaurant.test) / ${DEMO_PASSWORD}`);
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
