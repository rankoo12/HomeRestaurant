import type { FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../middleware/auth.js';

/**
 * Minimal guarded probe routes so the RBAC matrix is real and testable before
 * the host/admin feature routes exist (Phases 7–8). See docs/specs/identity/03-rbac.md.
 * These return the caller's role; their value is the guard, not the payload.
 */
export async function registerRbacProbeRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/host/ping',
    { preHandler: [authenticate, requireRole('host', 'admin')] },
    async (req) => ({ ok: true, area: 'host', role: req.user?.role }),
  );

  app.get(
    '/api/admin/ping',
    { preHandler: [authenticate, requireRole('admin')] },
    async (req) => ({ ok: true, area: 'admin', role: req.user?.role }),
  );
}
