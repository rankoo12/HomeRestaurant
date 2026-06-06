# Phase 3 — Identity & RBAC

**Branch:** `phase-3-identity` · **Depends on:** Phase 2 · **Status:** ✅ Complete

## Objective
Real authentication and server-enforced authorization across guest / host / admin.

## In scope
- `modules/identity`: registration, login, logout, password hashing, JWT issue/verify, `me`.
- API middleware: auth guard + RBAC role-guard matrix.
- Frontend: `/login`, `/signup` wired to the proxy; session handling; redirect-on-403.
- 403 behavior for cross-role access.

## Out of scope
- OAuth social providers unless re-scoped (email/password first). KYC (that's Phase 7). Admin user-management actions (Phase 8).

## Requires specs
- [`docs/specs/identity/`](../identity/00-index.md) *(✅ authored)* — the **identity & RBAC spec tree**:
  auth flows, token/session model (JWT + Redis refresh, httpOnly cookies), the role→route guard matrix,
  the 403 contract, and the password policy. Read `identity/00-index.md` first.

## Acceptance checklist
- [x] Signup → login → logout works end-to-end through the proxy. *(verified via the real proxy: register sets httpOnly cookies; logout clears them and a protected route then redirects to /login.)*
- [x] Passwords hashed; JWT issued and verified server-side. *(argon2id; HS256 access JWT, verified in middleware.)*
- [x] Guest hitting `/host/**` or `/admin/**` gets 403. *(backend probe routes return 403; frontend area layouts redirect guests to /403.)*
- [x] `GET /api/users/me` returns the authenticated profile. *(200 with token, 401 without.)*
- [x] Auth + RBAC middleware unit-tested. *(16 unit tests; plus 20 integration tests incl. the full auth flow.)*

## What shipped
- **Spec tree:** [`docs/specs/identity/`](../identity/00-index.md) (5 files).
- **Backend `modules/identity`:** `password.ts` (argon2id), `jwt.ts` (access JWT), `refresh-store.ts`
  (opaque refresh tokens in Redis, rotated + revocable), `auth.service.ts` (register/login/refresh/logout/me),
  `findByEmailWithHash` repo method. Shared `AppError` + canonical error codes.
- **API:** `@fastify/cookie`, central error handler, `authenticate` + `requireRole` middleware, routes
  `/api/auth/{register,login,refresh,logout}`, `/api/users/me`, and guarded `/api/{host,admin}/ping` probes.
- **Redis:** `src/db/redis.ts` client (lazy), wired into env.
- **Frontend:** proxy routes `/api/proxy/auth/{login,register,logout}` (token↔httpOnly-cookie translation),
  `lib/auth.ts` + `lib/session.ts` (`getCurrentUser`, `requireArea`), functional `/login` `/signup`,
  per-area guards (`guest`/`host`/`admin` layouts), and a `/403` page.

## Notes
- **Token model:** access JWT (15m) + opaque refresh token (7d) in Redis, rotated each refresh, revoked on
  logout. Chosen for real, revocable sessions (suspend/logout) on a trust-focused platform — not as a copy
  of any prior project.
- **Phase-3 UI is functional, not final.** `/login`, `/signup`, `/403` use inline styles as a deliberate
  stopgap; they're restyled with the design system (Tailwind + atoms) in Phase 4. This is the one place we
  intentionally defer the "no inline styles" rule, recorded here.
- **Deferred:** password reset (needs an email provider — arrives with notifications); OAuth social login;
  transparent access-token refresh in server components (the read-only session check treats an expired
  access token as logged-out; the client re-auths via the refresh route).
