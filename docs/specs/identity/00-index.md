# Identity & RBAC — Spec Tree

> The authentication & authorization specs for **Phase 3**. Split by concern so the security design is
> browsable one piece at a time. Read this index first for the locked decisions, then the per-area files.

## Map

| Spec | Covers |
|---|---|
| [01-auth-flows.md](./01-auth-flows.md) | Register, login, refresh, logout, `me` — the request/response sequences and error cases. |
| [02-token-and-session.md](./02-token-and-session.md) | Access-JWT claims + TTL, refresh-token rotation, Redis storage, the httpOnly cookie contract. |
| [03-rbac.md](./03-rbac.md) | Roles (guest/host/admin), the **route → required-role matrix**, and the 403 contract. |
| [04-password-policy.md](./04-password-policy.md) | Hashing algorithm, password rules, and what never leaves the identity module. |

## Phase-3 scope reminder
Real auth + server-enforced RBAC. **In:** register/login/logout/refresh, password hashing, JWT issue/verify,
`GET /users/me`, auth + role middleware, and frontend `/login` `/signup` wired through the proxy with a 403
page. **Out:** OAuth social providers, KYC (Phase 7), admin user-management actions (Phase 8).

## Decisions locked for Phase 3
- **Token model:** short-lived **access JWT** (15 min) + long-lived **refresh token** (7 days) stored
  server-side in **Redis**, rotated on every refresh. Revocable — logout and (future) suspend delete it.
- **Transport:** the Next.js **API proxy sets httpOnly, SameSite=Lax, Secure cookies**; the browser never
  reads the token (XSS-safe). The proxy is the only channel to the backend (per CLAUDE.md).
- **Password hashing:** **argon2id** (memory-hard, current OWASP recommendation). `password_hash` never
  leaves the identity module — it's absent from the `User` domain type.
- **RBAC:** enforced **server-side** in Fastify middleware. A guest hitting `/host/**` or `/admin/**` is a
  backend **403**, never merely hidden by the UI.
- **Redis** is introduced this phase (refresh-token store). Reused later for the seat-count cache (Phase 6)
  and BullMQ jobs.

## Cross-references
- Builds on the `users` table + `PostgresUserRepository` from [data/02-identity-tables.md](../data/02-identity-tables.md).
- The 403 presentation is finalized with the other edge states in
  [phases/error-and-empty-states.md](../phases/error-and-empty-states.md) (Phase 8).
