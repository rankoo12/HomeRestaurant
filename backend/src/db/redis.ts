import { Redis } from 'ioredis';
import { loadEnv } from '../config/env.js';

/**
 * Shared Redis client. One connection per process.
 *
 * Used in Phase 3 as the refresh-token store (revocable, self-expiring keys).
 * Reused later for the seat-count cache (Phase 6) and BullMQ (jobs).
 */
let client: Redis | undefined;

export function getRedis(): Redis {
  if (client) return client;

  const env = loadEnv();
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is not set — cannot create a Redis client.');
  }

  client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
