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
