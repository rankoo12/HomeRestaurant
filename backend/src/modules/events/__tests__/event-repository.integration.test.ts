import type pg from 'pg';
import { createTestPool, truncateAll, testDatabaseUrl } from '../../../db/__tests__/test-db.js';
import { closePool } from '../../../db/index.js';
import { PostgresUserRepository } from '../../identity/postgres.user-repository.js';
import { PostgresChefRepository } from '../../chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../postgres.event-repository.js';

const maybe = testDatabaseUrl() ? describe : describe.skip;

maybe('PostgresEventRepository (integration)', () => {
  let pool: pg.Pool;
  const users = new PostgresUserRepository();
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();

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

  async function makeChef(slug = 'chef-a'): Promise<string> {
    const user = await users.create(
      { email: `${slug}@t.co`, fullName: 'Chef', role: 'host' },
      pool,
    );
    await chefs.create(
      { userId: user.id, slug, cuisine: 'Test', city: 'NYC', tagline: 't', bio: 'b' },
      pool,
    );
    return user.id;
  }

  it('creates an event with courses and tags atomically', async () => {
    const chefId = await makeChef();
    const created = await events.create(
      {
        slug: 'dinner-1',
        chefId,
        title: 'Dinner One',
        cuisine: 'Test',
        shortDescription: 'short',
        neighborhood: 'Somewhere',
        status: 'published',
        startsAt: new Date('2026-06-07T18:30:00Z'),
        durationMinutes: 120,
        priceCents: 6800,
        seatsTotal: 10,
        courses: [
          { position: 1, name: 'Start', description: 'A' },
          { position: 2, name: 'Main', description: 'B' },
        ],
        tags: ['Communal table', 'Vegan options'],
      },
      pool,
    );

    expect(created.priceCents).toBe(6800);
    expect(created.seatsBooked).toBe(0);
    expect(created.courses).toHaveLength(2);
    expect(created.courses[0]?.name).toBe('Start');
    expect(created.tags).toEqual(['Communal table', 'Vegan options']);
  });

  it('finds an event by slug with details', async () => {
    const chefId = await makeChef();
    await events.create(
      {
        slug: 'dinner-2',
        chefId,
        title: 'Dinner Two',
        cuisine: 'Test',
        shortDescription: 'short',
        neighborhood: 'Here',
        startsAt: new Date('2026-06-08T18:30:00Z'),
        durationMinutes: 90,
        priceCents: 5000,
        seatsTotal: 6,
        tags: ['Wine pairing'],
      },
      pool,
    );

    const found = await events.findBySlug('dinner-2');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Dinner Two');
    expect(found?.tags).toEqual(['Wine pairing']);

    expect(await events.findBySlug('nope')).toBeNull();
  });

  it('lists events filtered by cuisine, max price, and required tags', async () => {
    const chefId = await makeChef();
    const base = {
      chefId,
      shortDescription: 's',
      neighborhood: 'n',
      durationMinutes: 60,
      seatsTotal: 8,
      status: 'published' as const,
    };
    await events.create(
      { ...base, slug: 'a', title: 'A', cuisine: 'Italian', startsAt: new Date('2026-06-01T00:00:00Z'), priceCents: 5000, tags: ['Wine pairing', 'Hands-on'] },
      pool,
    );
    await events.create(
      { ...base, slug: 'b', title: 'B', cuisine: 'Italian', startsAt: new Date('2026-06-02T00:00:00Z'), priceCents: 9000, tags: ['Wine pairing'] },
      pool,
    );
    await events.create(
      { ...base, slug: 'c', title: 'C', cuisine: 'Oaxacan', startsAt: new Date('2026-06-03T00:00:00Z'), priceCents: 4000, tags: [] },
      pool,
    );

    const italianUnder8000 = await events.list({ cuisine: 'Italian', maxPriceCents: 8000 });
    expect(italianUnder8000.map((e) => e.slug)).toEqual(['a']);

    const wineAndHandsOn = await events.list({ tags: ['Wine pairing', 'Hands-on'] });
    expect(wineAndHandsOn.map((e) => e.slug)).toEqual(['a']);

    const allSortedByStart = await events.list();
    expect(allSortedByStart.map((e) => e.slug)).toEqual(['a', 'b', 'c']);
  });
});
