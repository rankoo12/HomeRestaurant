import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool } from '../../../db/index.js';
import { PostgresUserRepository } from '../../identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../postgres.chef-repository.js';
import { PostgresEventRepository } from '../../events/postgres.event-repository.js';
import { PostgresReviewRepository } from '../../reviews/postgres.review-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

maybe('PostgresChefRepository (integration)', () => {
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const reviews = new PostgresReviewRepository();

  beforeAll(async () => {
    pool = await createTestPool();
  });
  afterAll(async () => {
    await closePool();
    await pool.end();
  });
  beforeEach(async () => {
    await truncateAll(pool);
  });

  it('creates a profile and lists badges', async () => {
    const user = await users.create({ email: 'c@t.co', fullName: 'Chef', role: 'host' }, pool);
    await chefs.create(
      { userId: user.id, slug: 'chef', cuisine: 'c', city: 'c', tagline: 't', bio: 'b' },
      pool,
    );
    await chefs.addBadge(user.id, 'ID verified', pool);
    await chefs.addBadge(user.id, 'Food-safety certified', pool);

    const badges = await chefs.listBadges(user.id);
    expect(badges.map((b) => b.label)).toEqual(['Food-safety certified', 'ID verified']);
  });

  it('derives rating and review_count from chef_stats view', async () => {
    const host = await users.create({ email: 'h@t.co', fullName: 'H', role: 'host' }, pool);
    await chefs.create(
      { userId: host.id, slug: 'amara', cuisine: 'c', city: 'c', tagline: 't', bio: 'b' },
      pool,
    );
    const event = await events.create(
      {
        slug: 'e',
        chefId: host.id,
        title: 'E',
        cuisine: 'c',
        shortDescription: 's',
        neighborhood: 'n',
        startsAt: new Date('2026-06-07T18:30:00Z'),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal: 8,
      },
      pool,
    );

    const g1 = await users.create({ email: 'g1@t.co', fullName: 'G1' }, pool);
    const g2 = await users.create({ email: 'g2@t.co', fullName: 'G2' }, pool);
    await reviews.create({ eventId: event.id, chefId: host.id, authorId: g1.id, rating: 5, body: 'a' }, pool);
    await reviews.create({ eventId: event.id, chefId: host.id, authorId: g2.id, rating: 4, body: 'b' }, pool);

    const profile = await chefs.findBySlugWithStats('amara');
    expect(profile).not.toBeNull();
    expect(profile?.stats.reviewCount).toBe(2);
    expect(profile?.stats.rating).toBeCloseTo(4.5, 2);
    expect(profile?.stats.dinnersHosted).toBe(0); // event is published, not completed
  });

  it('returns null for an unknown slug', async () => {
    expect(await chefs.findBySlugWithStats('ghost')).toBeNull();
  });
});
