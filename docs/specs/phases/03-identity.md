# Phase 3 — Identity & RBAC

**Branch:** `phase-3-identity` · **Depends on:** Phase 2 · **Status:** 📝 Not started

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
- `docs/specs/identity-and-rbac.md` *(to author this phase)* — auth flows, token lifecycle/refresh, password policy, the full **role → route** guard matrix, and 403 contract.

## Acceptance checklist
- [ ] Signup → login → logout works end-to-end through the proxy.
- [ ] Passwords hashed; JWT issued and verified server-side.
- [ ] Guest hitting `/host/**` or `/admin/**` gets 403.
- [ ] `GET /api/users/me` returns the authenticated profile.
- [ ] Auth + RBAC middleware unit-tested.
