# RBAC — Roles & Route Guards

> Authorization is **enforced server-side** in Fastify. The frontend may *hide* links for UX, but the
> security boundary is the backend 403. Never trust a client-supplied role.

## Roles
| Role | Who | Can reach |
|---|---|---|
| `guest` | default for every new account | public + guest areas |
| `host` | a guest who completed onboarding + admin approval (Phase 7) | guest areas + `/host/**` |
| `admin` | platform staff | everything, incl. `/admin/**` |

Roles are **not** hierarchical in code by accident — we encode allowed sets explicitly. (A host can also
act as a guest, so `host` is allowed in guest areas; admin is allowed everywhere. This is expressed in the
matrix, not assumed.)

## Middleware
- `authenticate` — verifies the access JWT, sets `req.user = { sub, role }`. Missing/invalid → `401 UNAUTHENTICATED`.
- `requireRole(...roles)` — runs after `authenticate`; if `req.user.role` ∉ allowed → `403 FORBIDDEN`.

## Route → required-role matrix (backend API)

| API route group | authenticate | allowed roles |
|---|---|---|
| `/api/auth/**` | no | — (public) |
| `/api/events` (read), `/api/chefs/**` (read) | no | public (discovery is open) |
| `/api/users/me` | yes | any authenticated |
| `/api/bookings/**` | yes | guest, host, admin |
| `/api/host/**` | yes | host, admin |
| `/api/admin/**` | yes | admin |

> The frontend route groups mirror this: `/host/**` requires `host`/`admin`, `/admin/**` requires `admin`.
> The proxy/middleware decides; the `(app)` shell additionally redirects unauthenticated users to `/login`.

## 403 contract
- Backend returns `403 { error: { code: 'FORBIDDEN', message } }`.
- The Next.js proxy surfaces this; the app renders the **403 page** (prompt to log in with the right
  account). Final 403 UI is specified with the other edge states in
  [phases/error-and-empty-states.md](../phases/error-and-empty-states.md) (Phase 8); Phase 3 ships a
  functional version.
- Unauthenticated access to a protected route → redirect to `/login` (not a 403).

## What Phase 3 enforces vs. defers
- **Enforces now:** the matrix above, with `/host/**` and `/admin/**` guards provably returning 403 for
  guests (tested).
- **Defers:** there are no host/admin *feature* routes yet (Phases 7–8). Phase 3 adds a minimal guarded
  probe route per role so the guards are real and tested end-to-end.
