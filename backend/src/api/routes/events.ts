import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { PostgresEventRepository } from '../../modules/events/postgres.event-repository.js';
import { PostgresChefRepository } from '../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresReviewRepository } from '../../modules/reviews/postgres.review-repository.js';
import type { EventListItem } from '../../modules/events/interfaces.js';

/**
 * Public events read API (no auth). Only `published` events are exposed.
 * See docs/specs/discovery/01-events-read-api.md.
 */
const listQuerySchema = z.object({
  cuisine: z.string().min(1).optional(),
  maxPrice: z.coerce.number().nonnegative().optional(), // dollars
  tags: z.string().min(1).optional(), // comma-separated
  sort: z.enum(['soonest', 'price', 'top-rated']).default('soonest'),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

function toListDto(item: EventListItem) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    cuisine: item.cuisine,
    neighborhood: item.neighborhood,
    startsAt: item.startsAt,
    priceCents: item.priceCents,
    seatsTotal: item.seatsTotal,
    seatsLeft: item.seatsLeft,
    imageSeed: item.imageSeed,
    chef: item.chef,
  };
}

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  const events = new PostgresEventRepository();
  const chefs = new PostgresChefRepository();
  const reviews = new PostgresReviewRepository();

  app.get('/api/events', async (req) => {
    const q = listQuerySchema.parse(req.query);
    const { items, total } = await events.listForDiscovery({
      status: 'published',
      cuisine: q.cuisine,
      maxPriceCents: q.maxPrice != null ? Math.round(q.maxPrice * 100) : undefined,
      tags: q.tags ? q.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      sort: q.sort,
      limit: q.limit,
      offset: q.offset,
    });
    return { events: items.map(toListDto), total, limit: q.limit, offset: q.offset };
  });

  app.get('/api/events/:slug', async (req) => {
    const { slug } = req.params as { slug: string };
    const event = await events.findBySlug(slug);
    if (!event || event.status !== 'published') {
      throw new AppError('NOT_FOUND', 'Event not found');
    }

    const chef = await chefs.findPublicByUserId(event.chefId);
    const eventReviews = await reviews.listByEventWithAuthor(event.id, 6);

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      cuisine: event.cuisine,
      neighborhood: event.neighborhood,
      shortDescription: event.shortDescription,
      startsAt: event.startsAt,
      durationMinutes: event.durationMinutes,
      priceCents: event.priceCents,
      seatsTotal: event.seatsTotal,
      seatsLeft: event.seatsTotal - event.seatsBooked,
      imageSeed: event.imageSeed,
      courses: event.courses.map((c) => ({
        position: c.position,
        name: c.name,
        description: c.description,
      })),
      tags: event.tags,
      chef,
      reviews: eventReviews,
    };
  });
}
