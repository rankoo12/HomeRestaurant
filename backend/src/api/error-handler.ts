import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../types/index.js';

/**
 * Central error handler. Serializes every error as `{ error: { code, message } }`.
 * - AppError → its code + status (the canonical domain errors).
 * - ZodError → 400 VALIDATION_ERROR with field issues.
 * - anything else → 500 INTERNAL (message hidden in production).
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | AppError | ZodError, req: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        reply.status(error.status).send({
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        });
        return;
      }

      if (error instanceof ZodError) {
        reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        });
        return;
      }

      // Fastify's own validation (schema) errors carry a statusCode.
      const status = (error as FastifyError).statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        reply.status(status).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
        return;
      }

      req.log.error(error);
      reply.status(500).send({
        error: {
          code: 'INTERNAL',
          message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        },
      });
    },
  );
}
