import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { loadEnv } from '../../config/env.js';
import { ReviewService } from '../../modules/reviews/review.service.js';
import { PostgresReviewRepository } from '../../modules/reviews/postgres.review-repository.js';
import { PostgresBookingRepository } from '../../modules/booking/postgres.booking-repository.js';
import { PostgresEventRepository } from '../../modules/events/postgres.event-repository.js';

/**
 * Review write API (Phase 7). Ownership of the booking is the gate, not role.
 * See docs/specs/reviews-and-moderation.md §4.
 */
const submitSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(10).max(2000)),
});

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  const service = new ReviewService(
    new PostgresReviewRepository(),
    new PostgresBookingRepository(),
    new PostgresEventRepository(),
  );

  app.post('/api/reviews', { preHandler: authenticate }, async (req, reply) => {
    const body = submitSchema.parse(req.body);
    const review = await service.submit(req.user!.sub, body.bookingId, body.rating, body.body);
    reply.status(201);
    return { review };
  });

  app.get('/api/guest/reviewable', { preHandler: authenticate }, async (req) => {
    return { reviewable: await service.listReviewable(req.user!.sub) };
  });

  // Flag spam is rate limited per user (admin spec §9; inert under NODE_ENV=test).
  const abuseLimit = {
    rateLimit: { max: loadEnv().RATE_LIMIT_ABUSE_MAX, timeWindow: 60_000 },
  };
  app.post(
    '/api/reviews/:reviewId/flag',
    { preHandler: authenticate, config: abuseLimit },
    async (req) => {
      const { reviewId } = req.params as { reviewId: string };
      await service.flag(reviewId);
      return { flagged: true };
    },
  );
}
