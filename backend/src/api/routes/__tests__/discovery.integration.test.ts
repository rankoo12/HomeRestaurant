import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool } from '../../../db/index.js';
import { buildApp } from '../../app.js';
import { loadEnv } from '../../../config/env.js';
import { PostgresUserRepository } from '../../../modules/identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../../modules/events/postgres.event-repository.js';
import { PostgresReviewRepository } from '../../../modules/reviews/postgres.review-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

/** Discovery read APIs against real data (events list/filter/sort/detail, chef). */
maybe('discovery read API (integration)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const reviews = new PostgresReviewRepository();

  beforeAll(async () => {
    pool = await createTestPool();
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await closePool();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    await seed();
  });

  async function seed() {
    const host = await users.create({ email: 'amara@t.co', fullName: 'Amara Okafor', role: 'host' }, pool);
    await chefs.create(
      {
        userId: host.id,
        slug: 'amara',
        cuisine: 'West African',
        city: 'Brooklyn, NY',
        tagline: 'Lagos-born.',
        bio: 'Bio.',
        isSuperhost: true,
        verificationStatus: 'approved',
      },
      pool,
    );
    await chefs.addBadge(host.id, 'ID verified', pool);

    const published = await events.create(
      {
        slug: 'jollof-sunday',
        chefId: host.id,
        title: 'Sunday Jollof',
        cuisine: 'West African',
        shortDescription: 'A feast.',
        neighborhood: 'Bed-Stuy, Brooklyn',
        status: 'published',
        startsAt: new Date('2026-06-07T22:30:00Z'),
        durationMinutes: 180,
        priceCents: 6800,
        seatsTotal: 10,
        seatsBooked: 7,
        courses: [{ position: 1, name: 'To start', description: 'Suya' }],
        tags: ['Communal table', 'Halal options'],
      },
      pool,
    );
    // A pricier published event for sort tests.
    await events.create(
      {
        slug: 'kaiseki',
        chefId: host.id,
        title: 'Kaiseki',
        cuisine: 'Modern Kaiseki',
        shortDescription: 'Quiet.',
        neighborhood: 'SF',
        status: 'published',
        startsAt: new Date('2026-06-20T01:00:00Z'),
        durationMinutes: 150,
        priceCents: 14000,
        seatsTotal: 8,
        tags: [],
      },
      pool,
    );
    // A draft — must NOT appear in public results.
    await events.create(
      {
        slug: 'draft-event',
        chefId: host.id,
        title: 'Draft',
        cuisine: 'West African',
        shortDescription: 'Hidden.',
        neighborhood: 'Brooklyn',
        status: 'draft',
        startsAt: new Date('2026-06-08T22:30:00Z'),
        durationMinutes: 120,
        priceCents: 5000,
        seatsTotal: 6,
        tags: [],
      },
      pool,
    );

    const guest = await users.create({ email: 'g@t.co', fullName: 'Mara L.' }, pool);
    await reviews.create(
      { eventId: published.id, chefId: host.id, authorId: guest.id, rating: 5, body: 'Great' },
      pool,
    );
  }

  it('lists only published events with chef join', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/events' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2); // draft excluded
    expect(body.events.map((e: { slug: string }) => e.slug).sort()).toEqual(['jollof-sunday', 'kaiseki']);
    const jollof = body.events.find((e: { slug: string }) => e.slug === 'jollof-sunday');
    expect(jollof.seatsLeft).toBe(3); // 10 - 7
    expect(jollof.chef.name).toBe('Amara Okafor');
  });

  it('filters by cuisine and tags', async () => {
    const byCuisine = await app.inject({ method: 'GET', url: '/api/events?cuisine=Modern%20Kaiseki' });
    expect(byCuisine.json().events.map((e: { slug: string }) => e.slug)).toEqual(['kaiseki']);

    const byTag = await app.inject({ method: 'GET', url: '/api/events?tags=Halal%20options' });
    expect(byTag.json().events.map((e: { slug: string }) => e.slug)).toEqual(['jollof-sunday']);
  });

  it('sorts by price ascending', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/events?sort=price' });
    expect(res.json().events.map((e: { slug: string }) => e.slug)).toEqual(['jollof-sunday', 'kaiseki']);
  });

  it('returns full event detail with courses, tags, chef block, reviews', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/events/jollof-sunday' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.courses).toHaveLength(1);
    expect(body.tags).toContain('Communal table');
    expect(body.chef.badges).toContain('ID verified');
    expect(body.chef.stats.reviewCount).toBe(1);
    expect(body.reviews[0].author.name).toBe('Mara L.');
  });

  it('404s for an unknown or unpublished event', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/events/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/events/draft-event' })).statusCode).toBe(404);
  });

  it('returns a chef profile with stats, upcoming events, reviews', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chefs/amara' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Amara Okafor');
    expect(body.stats.reviewCount).toBe(1);
    expect(body.upcomingEvents.length).toBe(2); // both published, draft excluded
    expect(body.reviews[0].author.name).toBe('Mara L.');
  });

  it('404s for an unknown chef', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/chefs/ghost' })).statusCode).toBe(404);
  });
});
