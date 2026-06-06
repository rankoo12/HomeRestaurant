import type { FastifyInstance } from 'fastify';
import { AppError } from '../../types/index.js';
import { PostgresChefRepository } from '../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../modules/events/postgres.event-repository.js';
import { PostgresReviewRepository } from '../../modules/reviews/postgres.review-repository.js';

/**
 * Public chef profile read API (no auth). Profile + derived stats + upcoming
 * published events + recent reviews. See docs/specs/discovery/02-chef-read-api.md.
 */
export async function registerChefRoutes(app: FastifyInstance): Promise<void> {
  const chefs = new PostgresChefRepository();
  const events = new PostgresEventRepository();
  const reviews = new PostgresReviewRepository();

  app.get('/api/chefs/:slug', async (req) => {
    const { slug } = req.params as { slug: string };
    const chef = await chefs.findPublicBySlug(slug);
    if (!chef) throw new AppError('NOT_FOUND', 'Chef not found');

    // Resolve the chef's user id via the profile (slug → user_id) for queries.
    const profile = await chefs.findBySlugWithStats(slug);
    const chefId = profile?.userId;

    const upcoming = chefId
      ? (await events.listForDiscovery({ status: 'published', chefId, sort: 'soonest', limit: 12 }))
          .items
      : [];
    const chefReviews = chefId ? await reviews.listByChefWithAuthor(chefId, 12) : [];

    return {
      slug: chef.slug,
      name: chef.name,
      avatarSeed: chef.avatarSeed,
      city: chef.city,
      cuisine: chef.cuisine,
      tagline: chef.tagline,
      bio: chef.bio,
      coverSeed: chef.coverSeed,
      isSuperhost: chef.isSuperhost,
      hostingSince: chef.hostingSince,
      verificationStatus: chef.verificationStatus,
      badges: chef.badges,
      stats: chef.stats,
      upcomingEvents: upcoming,
      reviews: chefReviews,
    };
  });
}
