import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import type { ServiceContainer } from '../service-container.js';

/**
 * Host portal API (Phase 7): event lifecycle, roster, dashboard, earnings.
 * host/admin role + row ownership on every event route (non-owner → 404).
 * See docs/specs/events.md §4 and docs/specs/payments.md §11.
 */
const courseSchema = z.object({
  position: z.number().int().min(1).max(8),
  name: z.string().min(2).max(40),
  description: z.string().min(4).max(300),
});

const createSchema = z.object({
  title: z.string().min(4).max(80),
  cuisine: z.string().min(2).max(40),
  shortDescription: z.string().min(20).max(500),
  neighborhood: z.string().min(2).max(80),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().min(60).max(480),
  priceCents: z.number().int().min(1000).max(50000),
  seatsTotal: z.number().int().min(2).max(24),
  imageSeed: z.number().int().min(0).max(64).optional(),
  courses: z.array(courseSchema).min(1).max(8),
  tags: z.array(z.string().min(2).max(30)).max(8).default([]),
});

const updateSchema = createSchema.partial();

export async function registerHostEventRoutes(
  app: FastifyInstance,
  services: ServiceContainer,
): Promise<void> {
  const { hostEventService } = services;
  const guard = { preHandler: [authenticate, requireRole('host', 'admin')] };
  const who = (req: { user?: { sub: string; role: string } }) => ({
    chefId: req.user!.sub,
    isAdmin: req.user!.role === 'admin',
  });

  app.get('/api/host/events', guard, async (req) => {
    return { events: await hostEventService.listOwn(req.user!.sub) };
  });

  app.post('/api/host/events', guard, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const event = await hostEventService.create(req.user!.sub, body);
    reply.status(201);
    return { event };
  });

  app.get('/api/host/events/:id', guard, async (req) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    return { event: await hostEventService.getOwn(id, chefId, isAdmin) };
  });

  app.put('/api/host/events/:id', guard, async (req) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const { chefId, isAdmin } = who(req);
    return { event: await hostEventService.update(id, chefId, isAdmin, body) };
  });

  app.post('/api/host/events/:id/publish', guard, async (req) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    return { event: await hostEventService.publish(id, chefId, isAdmin) };
  });

  app.post('/api/host/events/:id/unpublish', guard, async (req) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    return { event: await hostEventService.unpublish(id, chefId, isAdmin) };
  });

  app.post('/api/host/events/:id/cancel', guard, async (req) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    return hostEventService.cancel(id, chefId, isAdmin);
  });

  app.post('/api/host/events/:id/duplicate', guard, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    const event = await hostEventService.duplicate(id, chefId, isAdmin);
    reply.status(201);
    return { event };
  });

  app.get('/api/host/events/:id/guests', guard, async (req) => {
    const { id } = req.params as { id: string };
    const { chefId, isAdmin } = who(req);
    return { roster: await hostEventService.roster(id, chefId, isAdmin) };
  });

  app.get('/api/host/dashboard', guard, async (req) => {
    return hostEventService.dashboard(req.user!.sub);
  });

  app.get('/api/host/earnings', guard, async (req) => {
    return hostEventService.earnings(req.user!.sub);
  });
}
