# Backend — Home Restaurant API

Fastify + Node.js + TypeScript. The single source of truth for data, auth, and money.
Never imports from `frontend/`. See the root [`CLAUDE.md`](../CLAUDE.md) for the rules.

## Run it
```bash
cp .env.example .env       # configure
npm install
npm run db:migrate         # apply migrations (idempotent)
npm run db:seed            # demo data — chefs, events, reviews, payouts, 1 admin
npm run dev                # Fastify on http://localhost:4000  (GET /health)
npm run typecheck && npm run lint && npm test && npm run test:integration
```

**Demo logins (dev seed only):** every seeded user has the password `Demo1234` —
`admin@homerestaurant.test` (admin portal), `amara@homerestaurant.test` (host portal),
`mara@homerestaurant.test` (guest). The seed is the *only* way an admin account exists
(no API path grants admin — docs/specs/admin.md §6).

`npm run test:integration` needs `TEST_DATABASE_URL` (a separate database) plus the
Docker Postgres/Redis from the repo root `docker compose up -d`.

## Folder map

| Path | Purpose |
|---|---|
| `src/api/routes/` | Fastify route handlers (thin — delegate to modules). |
| `src/api/middleware/` | Auth, RBAC guards, error handling, request validation hooks. |
| `src/api/plugins/` | Fastify plugins (jwt, cors, db decorators). |
| `src/modules/` | **Domain modules.** Each is interface-first (`interfaces.ts` + impl + `__tests__/`). One bounded context per folder. |
| `src/workers/` | BullMQ background workers (payouts, notifications). |
| `src/db/` | PostgreSQL pool, transaction helpers, and `migrations/`. |
| `src/types/` | Shared TS types + zod schemas. |
| `src/config/` | Typed env loading and config. |
| `src/utils/` | Small pure helpers. |
| `scripts/` | Migration runner, seeds. |

## Payments — Stripe test-mode verification (manual, Phase 6)

The automated suite never touches Stripe: unit + integration tests inject a
`FakePaymentGateway` (`src/modules/payments/__tests__/fake-gateway.ts`), so CI needs **no Stripe
keys and no network**. Before merging payment-affecting changes, run this manual checklist once
against real Stripe **test mode**:

1. Get test keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and set in `.env`:
   `STRIPE_SECRET_KEY=sk_test_…`
2. Forward webhooks locally (prints the signing secret on start):
   ```bash
   stripe listen --forward-to localhost:4000/api/payments/webhook
   # → set STRIPE_WEBHOOK_SECRET=whsec_… in .env, restart npm run dev
   ```
3. In the app (`localhost:3000`): log in → open an event → **Reserve** → on checkout click
   **Pay with card** → you land on Stripe's hosted page.
4. Pay with card `4242 4242 4242 4242` (any future expiry / CVC / ZIP) → you should land on the
   confirmation page with a confirmation code, and `stripe listen` shows
   `checkout.session.completed` delivered with a 200.
5. Decline path: card `4000 0000 0000 0002` → Stripe shows the decline in place; click back
   (cancel URL) → checkout shows the **Payment-Failed** state with the hold countdown still live.
6. Expiry path: abandon the Stripe page ≥30 min → `checkout.session.expired` arrives → booking is
   cancelled and seats are released.
7. Verify in the DB: `payments.status = 'succeeded'`, `bookings.status = 'confirmed'`,
   `seat_holds.status = 'consumed'`, and one row in `stripe_webhook_events` per event id.

## Module convention

```
modules/<domain>/
  interfaces.ts          # the contract (depend on this, not the impl)
  <domain>.service.ts    # implementation
  __tests__/             # unit tests — a task isn't done without them
```

> Routes stay thin. Business logic lives in modules. Modules depend on abstractions, not each other's internals.
