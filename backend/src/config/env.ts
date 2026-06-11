import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Populate process.env from a local .env if present (no-op when the file is
// absent, e.g. in CI where env is injected directly).
loadDotenv();

/**
 * Typed, validated environment configuration.
 *
 * The app refuses to boot on missing/invalid env (fail fast at startup rather
 * than deep inside a request). See docs/specs/tooling-and-conventions.md §7.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    // Comma-free single origin for now; widened in later phases.
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    // PostgreSQL connection string. Required outside tests (unit tests that
    // never touch the DB can run without it); the DB layer asserts presence.
    DATABASE_URL: z.string().url().optional(),
    // Redis — refresh-token store (Phase 3). Required outside tests.
    REDIS_URL: z.string().url().optional(),
    // Auth (Phase 3). JWT_SECRET signs access tokens; required outside tests.
    JWT_SECRET: z.string().min(16).optional(),
    ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 min
    REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800), // 7 days
    // Payments (Phase 6) — see docs/specs/payments.md §9. Optional in tests
    // (the suite injects a FakePaymentGateway); required for real checkout.
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    // Single source of truth for the service fee — UI and charge can't disagree.
    SERVICE_FEE_RATE: z.coerce.number().min(0).max(1).default(0.1),
    // Base for Stripe success/cancel URLs; falls back to CORS_ORIGIN.
    CHECKOUT_RESULT_BASE_URL: z.string().url().optional(),
    // Rate limiting (Phase 8 hardening — docs/specs/admin.md §9). Defaults are
    // the spec values; unset RATE_LIMIT_ENABLED means "on outside tests".
    RATE_LIMIT_ENABLED: z.enum(['true', 'false']).optional(),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_ABUSE_MAX: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, ctx) => {
    const requiredOutsideTest: Array<keyof typeof env> = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
    ];
    if (env.NODE_ENV !== 'test') {
      for (const key of requiredOutsideTest) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when NODE_ENV is not "test"`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
