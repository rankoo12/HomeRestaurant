# Deploy Notes — Home Restaurant

> Phase 8 production-readiness notes (docs/specs/admin.md §9.4). This is a university
> project: the target is a single small VM / PaaS instance, not a fleet. Read the
> **single-instance assumption** before scaling anything.

## Topology

| Process | What | Listens |
|---|---|---|
| Fastify API | `backend/` — `npm run build && npm start` (or `npm run dev`) | `:4000` (`GET /health`) |
| Next.js app | `frontend/` — `npm run build && npm start` | `:3000` |
| PostgreSQL 16 | transactional source of truth | `:5432` |
| Redis 7 | refresh-token store + (future) cache/jobs | `:6379` |

The browser only talks to the Next app; authed/mutating calls flow through the Next
proxy (`/api/proxy/**`), which translates httpOnly cookies → Bearer tokens. The API
never serves browser pages.

## Environment variables

### Backend (`backend/.env` — see `.env.example` for the full annotated list)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Postgres connection string |
| `REDIS_URL` | yes | Redis connection string |
| `JWT_SECRET` | yes | long random value — rotating it logs everyone out |
| `CORS_ORIGIN` | yes | the frontend origin (exact, no wildcard) |
| `PORT` / `HOST` | no | default `4000` / `0.0.0.0` |
| `ACCESS_TTL_SECONDS` / `REFRESH_TTL_SECONDS` | no | 15 min / 7 days defaults (identity spec) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | for payments | without them the app boots but checkout fails with a clear error |
| `SERVICE_FEE_RATE` | no | default `0.10` — single source of truth for the fee |
| `CHECKOUT_RESULT_BASE_URL` | no | Stripe success/cancel base; defaults to `CORS_ORIGIN` |
| `RATE_LIMIT_*` | no | spec defaults baked in (admin spec §9); `RATE_LIMIT_ENABLED=false` to disable |

The app refuses to boot on missing/invalid required env (fail fast at startup).

### Frontend (`frontend/.env.local` — see `.env.example`)

| Variable | Required | Notes |
|---|---|---|
| `BACKEND_API_URL` | yes | where the proxy + server components reach the API (server-side only, default `http://localhost:4000`) |
| `NEXT_PUBLIC_SITE_URL` | yes | the public site URL (browser-exposed) |

## Migration order

Migrations are plain SQL in `backend/src/db/migrations/`, applied in filename order by
`npm run db:migrate` (idempotent — a `schema_migrations` ledger skips applied files).

1. Provision Postgres + Redis.
2. `cd backend && npm run db:migrate` — applies `0001…0007` in order (extensions/enums
   → users → chef tables → events → bookings/holds → payments/payouts → reviews/stats).
3. Optional demo data: `npm run db:seed` (demo chefs/guests/events/reviews/payouts plus
   `admin@homerestaurant.test`, all with the dev password documented in `backend/README.md`;
   **the only sanctioned way to create an `admin` user is seed/DB** — there is deliberately
   no API path that grants `admin`). Don't run the dev seed against production data — it
   truncates the domain tables.
4. Start the API, then the frontend.

**No Phase 8 migrations exist** — the admin portal reads/writes columns that have been
in place since Phase 2.

## Stripe webhook setup

1. Create a webhook endpoint in the Stripe dashboard pointing at
   `https://<api-host>/api/payments/webhook` with events
   `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`.
2. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Locally: `stripe listen --forward-to localhost:4000/api/payments/webhook` prints the
   `whsec_…` value.

Webhook processing is idempotent (event-ledger insert in the same transaction as the
effects — payments spec §5), so Stripe retries are safe. CI never talks to Stripe; real
test-mode verification is the manual checklist in `backend/README.md`.

## The two in-process sweepers (and the single-instance assumption)

`backend/src/api/server.ts` runs one `setInterval` every 5 minutes that:

1. **expires stale seat holds** (`seat_holds` hygiene — correctness never depends on it;
   availability queries discount expired holds by timestamp), and
2. **completes past events** (`published` whose end time passed → `completed`, which is
   what opens review eligibility).

Both are status/time-guarded UPDATEs, so they are concurrency-safe if you ever run two
API instances — but the design assumption is **one API instance**: the sweepers and the
rate-limit counters (in-memory per process) are per-instance. Scaling out would need a
shared rate-limit store (the plugin supports Redis) and moving the sweeps to one place
(BullMQ repeatable job — the worker infra deliberately doesn't exist yet).

## Hardening that is live (Phase 8)

- **Rate limiting** (`@fastify/rate-limit`): login/register 10/min/IP, refresh
  30/min/IP, review-flag + booking-hold 30/min/user, global 300/min backstop. 429s use
  the standard error envelope (`RATE_LIMITED`); disabled under `NODE_ENV=test`.
- **Headers** (`@fastify/helmet`): defaults with CSP report-only — the API serves JSON;
  the Next app owns its pages.
- **Suspension is total**: suspend revokes every refresh token; the ≤15-min access-token
  tail is accepted per the token spec. Login/refresh both reject suspended users.
- **RBAC**: every `/api/admin/**` route is `requireRole('admin')` server-side; the
  frontend guard is UX only. `admin` is not grantable via any API.
- Out of scope by decision: CSRF tokens (SameSite=Lax + Bearer-proxy pattern), 2FA,
  CAPTCHA, admin password reset (suspension is the compromise response).

## Final pass checklist (run before calling a build shippable)

```bash
# backend
cd backend && npm run typecheck && npm run lint && npm test && npm run test:integration
# frontend
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```

- `npm audit`: backend 0 known vulnerabilities; frontend has the documented
  postcss-via-next moderate advisory (accepted — `docs/known-issues/frontend-postcss-audit.md`).
- No `console.log` in either `src/` tree (structured pino logs only on the backend).
- `.env` files are never committed; `.env.example` is the complete contract.
- Seeds produce a demo-able state (guests, an approved chef with events, paid payouts).
