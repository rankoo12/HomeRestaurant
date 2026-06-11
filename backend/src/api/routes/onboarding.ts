import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { OnboardingService, SLUG_PATTERN } from '../../modules/chef-onboarding/onboarding.service.js';
import { PostgresChefRepository } from '../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresUserRepository } from '../../modules/identity/postgres.user-repository.js';

/**
 * Host onboarding API (Phase 7). Submit is open to authenticated guests (the
 * role upgrade happens server-side inside the transaction); state reads and
 * resubmission require the host role. See
 * docs/specs/chef-onboarding-and-verification.md §4.
 */
const idDocumentSchema = z.object({
  kind: z.enum(['passport', 'drivers_license', 'national_id']),
  reference: z.string().min(4).max(64),
});
const foodSafetySchema = z.object({
  declared: z.literal(true),
  certificateRef: z.string().min(2).max(64).optional(),
});

const submitSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN, 'Lowercase letters, digits and dashes only'),
  cuisine: z.string().min(2).max(40),
  city: z.string().min(2).max(60),
  tagline: z.string().min(4).max(80),
  bio: z.string().min(40).max(2000),
  coverSeed: z.number().int().min(0).max(64).optional(),
  idDocument: idDocumentSchema,
  foodSafety: foodSafetySchema,
});

const updateSchema = z.object({
  cuisine: z.string().min(2).max(40).optional(),
  city: z.string().min(2).max(60).optional(),
  tagline: z.string().min(4).max(80).optional(),
  bio: z.string().min(40).max(2000).optional(),
  coverSeed: z.number().int().min(0).max(64).optional(),
  resubmit: z
    .object({ idDocument: idDocumentSchema, foodSafety: foodSafetySchema })
    .optional(),
});

export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  const service = new OnboardingService(
    new PostgresChefRepository(),
    new PostgresUserRepository(),
  );

  app.post('/api/host/onboarding', { preHandler: authenticate }, async (req, reply) => {
    if (req.user!.role !== 'guest' && req.user!.role !== 'admin') {
      throw new AppError('PROFILE_EXISTS', 'You already have a host profile.');
    }
    const body = submitSchema.parse(req.body);
    const state = await service.submit(req.user!.sub, body);
    reply.status(201);
    return state;
  });

  app.get(
    '/api/host/onboarding',
    { preHandler: [authenticate, requireRole('host', 'admin')] },
    async (req) => service.getState(req.user!.sub),
  );

  app.put(
    '/api/host/onboarding',
    { preHandler: [authenticate, requireRole('host', 'admin')] },
    async (req) => {
      const body = updateSchema.parse(req.body);
      const { resubmit, ...fields } = body;
      return service.update(req.user!.sub, fields, resubmit);
    },
  );

  app.get('/api/host/onboarding/slug-check', { preHandler: authenticate }, async (req) => {
    const { slug } = z.object({ slug: z.string().min(1).max(64) }).parse(req.query);
    return service.checkSlug(slug);
  });
}
