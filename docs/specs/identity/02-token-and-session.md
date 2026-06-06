# Tokens & Sessions

> How access/refresh tokens are shaped, stored, rotated, and carried.

## Access token (JWT)
- **Lifetime:** 15 minutes. Stateless — verified by signature, not a DB/Redis lookup (fast path).
- **Algorithm:** HS256, signed with `JWT_SECRET` (required env; app refuses to boot without it).
- **Claims:**
  | Claim | Meaning |
  |---|---|
  | `sub` | user id (UUID) |
  | `role` | `guest` \| `host` \| `admin` (lets RBAC avoid a DB read on the hot path) |
  | `iat` / `exp` | issued-at / expiry (15 min) |
  | `type` | `"access"` (guards against using a refresh token as an access token) |
- The `role` claim is a snapshot. A role/suspend change takes effect within one access-token lifetime
  (≤15 min), or immediately on the next refresh (which re-reads the user).

## Refresh token
- **Lifetime:** 7 days. **Opaque random string** (not a JWT) — 32 bytes, base64url.
- **Stored in Redis**, keyed so it's revocable and self-expiring:
  - Key: `refresh:<tokenId>` → value: `{ userId, createdAt }`, Redis TTL = 7 days.
  - (A `tokenId` is embedded with the secret half so lookup is O(1) and the raw secret is compared.)
- **Rotation:** every `/auth/refresh` deletes the presented token and stores a fresh one. Reusing a
  rotated (deleted) token fails → forces re-login. (Simple reuse-detection: the key is just gone.)
- **Revocation:** logout deletes the key; account suspension (Phase 8) deletes all of a user's keys.

> Why opaque + Redis instead of a second JWT: a JWT refresh can't be revoked before expiry without a
> server-side check anyway — so we keep the server-side store and skip the JWT overhead for refresh.

## Cookies (browser ↔ Next.js proxy)
The proxy owns cookies; the browser never sees raw tokens in JS.

| Cookie | Contents | Flags |
|---|---|---|
| `hr_access` | access JWT | `httpOnly`, `SameSite=Lax`, `Secure` (prod), `Path=/`, `Max-Age=900` |
| `hr_refresh` | refresh token | `httpOnly`, `SameSite=Lax`, `Secure` (prod), `Path=/api/auth`, `Max-Age=604800` |

- `Secure` is set in production; omitted on localhost http during dev.
- `hr_refresh` is path-scoped to `/api/auth` so it's only sent on refresh/logout, not every request.
- The proxy reads `hr_access` and forwards `Authorization: Bearer <jwt>` to Fastify. On a `401` with an
  expired access token, the proxy may transparently call `/auth/refresh` once and retry.

## Env (added this phase)
- `JWT_SECRET` (required) — HS256 signing key.
- `REDIS_URL` (required outside tests) — refresh-token store.
- `ACCESS_TTL_SECONDS` (default 900), `REFRESH_TTL_SECONDS` (default 604800) — tunable.
