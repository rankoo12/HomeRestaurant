# Auth Flows

> Endpoint sequences and error cases. Token/cookie mechanics are in
> [02-token-and-session.md](./02-token-and-session.md); roles in [03-rbac.md](./03-rbac.md).

All endpoints live under the Fastify API and are reached by the browser **only through the Next.js proxy**,
which translates between httpOnly cookies (browser ↔ proxy) and `Authorization: Bearer` + refresh handling
(proxy ↔ Fastify).

## Endpoints (Phase 3)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | none | Create a user, return tokens. |
| POST | `/api/auth/login` | none | Verify credentials, return tokens. |
| POST | `/api/auth/refresh` | refresh token | Rotate refresh, issue new access token. |
| POST | `/api/auth/logout` | refresh token | Revoke the refresh token (delete from Redis). |
| GET | `/api/users/me` | access token | Return the authenticated user's profile. |

## Register
1. Validate body with zod: `email`, `password`, `fullName`, optional `dietaryPrefs[]`. Role is **not**
   client-settable — always created as `guest` (becoming a host is the Phase 7 onboarding flow).
2. Reject if email already exists → `409 EMAIL_TAKEN`.
3. Enforce the password policy ([04](./04-password-policy.md)); hash with argon2id.
4. Insert the user; issue access + refresh tokens.
5. Proxy sets httpOnly cookies; response body returns the safe `User` (never the hash).

## Login
1. Validate `email`, `password`.
2. Look up by email; if missing **or** password mismatch → `401 INVALID_CREDENTIALS` (same message for
   both, so we don't leak which emails exist).
3. If `is_suspended` → `403 ACCOUNT_SUSPENDED`.
4. Issue tokens; set cookies; return the `User`.

## Refresh
1. Read the refresh token (cookie → proxy → backend).
2. Validate it exists in Redis and isn't expired; if not → `401 INVALID_REFRESH`.
3. **Rotate:** delete the old refresh token, store a new one, issue a new access token. (Rotation means a
   stolen-and-reused old token is already invalid.)
4. Set new cookies.

## Logout
1. Delete the refresh token from Redis (idempotent — unknown token still returns `204`).
2. Proxy clears the cookies.

## Me
1. `authenticate` middleware verifies the access JWT.
2. Return the `User` for `req.user.sub`. If the user no longer exists or is suspended → `401`.

## Error codes (reuse these; don't invent new strings)
`EMAIL_TAKEN` (409) · `INVALID_CREDENTIALS` (401) · `ACCOUNT_SUSPENDED` (403) ·
`INVALID_REFRESH` (401) · `UNAUTHENTICATED` (401) · `FORBIDDEN` (403) · `VALIDATION_ERROR` (400).
These are the canonical domain error codes for the identity module — added to the shared error type.
