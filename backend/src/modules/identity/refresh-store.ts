import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';
import { getRedis } from '../../db/index.js';
import { loadEnv } from '../../config/env.js';

/**
 * Refresh-token store backed by Redis. See docs/specs/identity/02-token-and-session.md.
 *
 * A refresh token is an opaque string `"<tokenId>.<secret>"`. We store only a
 * SHA-256 of the secret under `refresh:<tokenId>` with a TTL, so a Redis dump
 * never reveals usable tokens. Lookup is O(1) by tokenId; the secret is then
 * compared in constant time. Rotation = delete old key + issue a new token.
 */

const KEY_PREFIX = 'refresh:';
const USER_INDEX_PREFIX = 'refresh-user:'; // set of tokenIds per user (for revoke-all)

interface StoredRefresh {
  userId: string;
  secretHash: string;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function key(tokenId: string): string {
  return `${KEY_PREFIX}${tokenId}`;
}

function userIndexKey(userId: string): string {
  return `${USER_INDEX_PREFIX}${userId}`;
}

export class RefreshStore {
  private client: Redis | undefined;

  /** Optionally inject a Redis client (tests); otherwise resolved lazily. */
  constructor(client?: Redis) {
    this.client = client;
  }

  private get redis(): Redis {
    if (!this.client) this.client = getRedis();
    return this.client;
  }

  /** Issue a new refresh token for a user; returns the opaque token string. */
  async issue(userId: string): Promise<string> {
    const env = loadEnv();
    const tokenId = randomBytes(16).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    const stored: StoredRefresh = { userId, secretHash: sha256(secret) };

    const ttl = env.REFRESH_TTL_SECONDS;
    await this.redis
      .multi()
      .set(key(tokenId), JSON.stringify(stored), 'EX', ttl)
      .sadd(userIndexKey(userId), tokenId)
      .expire(userIndexKey(userId), ttl)
      .exec();

    return `${tokenId}.${secret}`;
  }

  /** Validate a presented token. Returns the userId if valid, else null. */
  async verify(token: string): Promise<string | null> {
    const parsed = this.parse(token);
    if (!parsed) return null;
    const raw = await this.redis.get(key(parsed.tokenId));
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredRefresh;
    if (!this.secretMatches(stored.secretHash, parsed.secret)) return null;
    return stored.userId;
  }

  /**
   * Rotate: verify the old token, delete it, issue a new one. Returns the new
   * token + userId, or null if the old token was invalid (forces re-login).
   */
  async rotate(token: string): Promise<{ token: string; userId: string } | null> {
    const parsed = this.parse(token);
    if (!parsed) return null;
    const raw = await this.redis.get(key(parsed.tokenId));
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredRefresh;
    if (!this.secretMatches(stored.secretHash, parsed.secret)) return null;

    await this.revokeTokenId(parsed.tokenId, stored.userId);
    const newToken = await this.issue(stored.userId);
    return { token: newToken, userId: stored.userId };
  }

  /** Revoke a single token (logout). Idempotent. */
  async revoke(token: string): Promise<void> {
    const parsed = this.parse(token);
    if (!parsed) return;
    const raw = await this.redis.get(key(parsed.tokenId));
    const userId = raw ? (JSON.parse(raw) as StoredRefresh).userId : undefined;
    await this.revokeTokenId(parsed.tokenId, userId);
  }

  /** Revoke every refresh token for a user (suspend / "log out everywhere"). */
  async revokeAllForUser(userId: string): Promise<void> {
    const ids = await this.redis.smembers(userIndexKey(userId));
    const pipeline = this.redis.multi();
    for (const id of ids) pipeline.del(key(id));
    pipeline.del(userIndexKey(userId));
    await pipeline.exec();
  }

  private async revokeTokenId(tokenId: string, userId?: string): Promise<void> {
    const pipeline = this.redis.multi();
    pipeline.del(key(tokenId));
    if (userId) pipeline.srem(userIndexKey(userId), tokenId);
    await pipeline.exec();
  }

  private parse(token: string): { tokenId: string; secret: string } | null {
    const dot = token.indexOf('.');
    if (dot <= 0 || dot === token.length - 1) return null;
    return { tokenId: token.slice(0, dot), secret: token.slice(dot + 1) };
  }

  private secretMatches(storedHash: string, presentedSecret: string): boolean {
    const a = Buffer.from(storedHash, 'hex');
    const b = Buffer.from(sha256(presentedSecret), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
