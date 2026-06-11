import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AdminService } from '../../modules/admin/admin.service.js';
import { PostgresAdminMetricsRepository } from '../../modules/admin/postgres.admin-metrics-repository.js';
import { PostgresUserRepository } from '../../modules/identity/postgres.user-repository.js';
import { RefreshStore } from '../../modules/identity/refresh-store.js';
import { PostgresChefRepository } from '../../modules/chef-onboarding/postgres.chef-repository.js';
import { PostgresEventRepository } from '../../modules/events/postgres.event-repository.js';
import { PostgresPayoutRepository } from '../../modules/payments/postgres.payout-repository.js';
import { PostgresReviewRepository } from '../../modules/reviews/postgres.review-repository.js';

/**
 * Admin portal API — Phase 8 (docs/specs/admin.md §4). Everything here is
 * `admin` only, enforced server-side; the frontend guard is UX sugar.
 */

const uuid = z.string().uuid();

const usersQuerySchema = z.object({
  q: z.string().min(1).max(120).optional(),
  role: z.enum(['guest', 'host', 'admin']).optional(),
  suspended: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const payoutsQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const rejectSchema = z.object({
  notes: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(4).max(500)),
});

// `admin` is deliberately absent — not grantable via API (admin spec §6/§11).
const roleSchema = z.object({ role: z.enum(['guest', 'host']) });

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  const service = new AdminService(
    new PostgresUserRepository(),
    new PostgresChefRepository(),
    new PostgresEventRepository(),
    new PostgresPayoutRepository(),
    new PostgresReviewRepository(),
    new PostgresAdminMetricsRepository(),
    new RefreshStore(),
    (payload, message) => app.log.info(payload, message),
  );

  const guard = { preHandler: [authenticate, requireRole('admin')] };
  const adminId = (req: { user?: { sub: string } }) => req.user!.sub;

  // --- Dashboard ---
  app.get('/api/admin/metrics', guard, async () => {
    return { metrics: await service.getMetrics() };
  });

  // --- Verification queue (chef-onboarding spec §11) ---
  app.get('/api/admin/verifications', guard, async () => {
    return { items: await service.listPendingVerifications() };
  });

  app.post('/api/admin/verifications/:chefId/approve', guard, async (req) => {
    const chefId = uuid.parse((req.params as { chefId: string }).chefId);
    const { profile, changed } = await service.approveVerification(chefId, adminId(req));
    return { profile, changed };
  });

  app.post('/api/admin/verifications/:chefId/reject', guard, async (req) => {
    const chefId = uuid.parse((req.params as { chefId: string }).chefId);
    const { notes } = rejectSchema.parse(req.body);
    const { profile, changed } = await service.rejectVerification(chefId, adminId(req), notes);
    return { profile, changed };
  });

  // --- User management ---
  app.get('/api/admin/users', guard, async (req) => {
    const q = usersQuerySchema.parse(req.query);
    const { items, total } = await service.listUsers(q);
    return { users: items, total, limit: q.limit, offset: q.offset };
  });

  app.post('/api/admin/users/:id/suspend', guard, async (req) => {
    const id = uuid.parse((req.params as { id: string }).id);
    return await service.suspendUser(id, adminId(req));
  });

  app.post('/api/admin/users/:id/unsuspend', guard, async (req) => {
    const id = uuid.parse((req.params as { id: string }).id);
    return { user: await service.unsuspendUser(id, adminId(req)) };
  });

  app.post('/api/admin/users/:id/role', guard, async (req) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const { role } = roleSchema.parse(req.body);
    const { user, changed } = await service.changeRole(id, role, adminId(req));
    return { user, changed };
  });

  // --- Payout admin ---
  app.get('/api/admin/payouts', guard, async (req) => {
    const q = payoutsQuerySchema.parse(req.query);
    return { payouts: await service.listPayouts(q), limit: q.limit, offset: q.offset };
  });

  app.post('/api/admin/payouts/:id/mark-paid', guard, async (req) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const { payout, changed } = await service.markPayoutPaid(id, adminId(req));
    return { payout, changed };
  });

  // --- Moderation (reviews spec §11) ---
  app.get('/api/admin/reviews/flagged', guard, async () => {
    return { items: await service.listFlaggedReviews() };
  });

  app.post('/api/admin/reviews/:id/dismiss-flag', guard, async (req) => {
    const id = uuid.parse((req.params as { id: string }).id);
    return { review: await service.dismissFlag(id, adminId(req)) };
  });

  app.delete('/api/admin/reviews/:id', guard, async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    await service.removeReview(id, adminId(req));
    reply.status(204).send();
  });
}
