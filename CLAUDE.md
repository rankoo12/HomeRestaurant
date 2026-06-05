# Home Restaurant — Claude Code Orientation

> **First read for new agents.** Start here, then open `docs/specs/00-index.md` for the full spec map.
> This file defines *how we work* on this project. The discipline is modelled on our previous projects
> (Kaizen 2.0, AICryptoAdvisor) but the architecture below is specific to **Home Restaurant** — do not
> carry over their domain modules or assumptions.

---

## Pre-Implementation Protocol

Run this before writing any code. No exceptions.

1. **Read `docs/specs/00-index.md`** — get the list of spec files covering the area you are about to touch.
2. **Open and read the relevant spec fully** before implementing. We are **spec-driven (SDD)**: every non-trivial change ships with a spec first.
3. **If no spec covers the layer you are about to touch** — stop. Ask the user for clarification before writing implementation code.
4. **Before writing any error message string** — check existing error enums / domain error types and reuse them.
5. **Confirm the target file path** against the Layer Map below and the `/backend` vs `/frontend` boundary.
6. **Check the relevant `package.json`** (`/backend` or `/frontend`) — confirm every package you import is listed. Add missing packages via `npm install` *before* writing the import.
7. **Locate the test file** — check the module's `__tests__/` directory. Update or create it before declaring the task finished.
8. **After implementation** — run `npm run typecheck` and `npm run lint` in the affected workspace before reporting done.
9. **Check `docs/known-issues/`** — documented gaps and accepted limitations live there. Don't re-investigate something already recorded as known.

---

## What This Project Is

A web-based **peer-to-peer home-dining platform**. Guests discover, reserve, and attend dining events
hosted by **verified home-based chefs**; chefs manage their events, guests, and earnings; admins handle
chef verification (KYC), moderation, and platform health.

University final project by **Ran Eckstein** and **Inbar Halutzy**.

The product's competitive edges, per the project analysis, are **trust & safety** (identity verification,
transparent reviews, RBAC), **low-friction booking**, and **concurrency-safe seat allocation** (no overbooking).

**Stack:** Next.js (Frontend, App Router + Tailwind) · Fastify (Backend, Node.js + TypeScript) ·
PostgreSQL (transactional source of truth) · Redis (cache + sessions) · BullMQ (background jobs) ·
Stripe (payments). JWT/OAuth2 auth with RBAC across **guest / host / admin** roles.

### Explicitly out of scope (do not build unless the user re-scopes)

- **AI Menu Assistant / Local LLMs** — the `/host/ai-assistant` route in the page spec is **not implemented**. No LLM gateway, no Ollama, no AI dependencies. If you encounter references to it, treat them as deferred, not pending.
- **ML guest-match recommender** — out of scope. Discovery uses deterministic search + filters only.
- **Native mobile app** and **real-time chat** — out of scope per the project book (messaging widgets are non-realtime).

---

## Layer Map

| Directory | Role |
|---|---|
| `frontend/` | Next.js App Router application. Pages, layouts, and the API proxy to the backend. Authenticated routes (`/guest/**`, `/host/**`, `/admin/**`) live under a shared shell (Nav + Footer). |
| `frontend/src/components/` | **Atomic Design** components — `atoms/`, `molecules/`, `organisms/`, `templates/`. Mirror the prototyped primitives in `docs/design/app/` (Icon, Logo, FoodImage, Avatar, Stars, SeatsMeter, Price, Stepper, VerifiedPill). |
| `frontend/src/hooks/` | React data-fetching and business-logic hooks, decoupling state from UI. |
| `frontend/src/styles/` | Tailwind config + the design tokens ported from `docs/design/app/styles.css` (warm/dark themes as CSS variables — never hardcode colors). |
| `backend/src/api/` | Fastify app: route handlers, middleware (auth/RBAC), and the server entrypoint. |
| `backend/src/modules/` | Domain modules, each interface-first (`interfaces.ts`) with an implementation and a `__tests__/` folder. See Modular Decomposition below. |
| `backend/src/workers/` | BullMQ workers for background jobs (e.g. payout processing, email/notification dispatch). |
| `backend/src/db/` | PostgreSQL connection pool and transaction helpers. |
| `backend/src/types/` | Shared TypeScript interfaces and zod schemas. |
| `scripts/` | Migrations and seed scripts. |
| `docs/specs/` | Domain-grouped SDD specs. Every non-trivial change ships with a spec here first. `00-index.md` is the map. |
| `docs/known-issues/` | Documented gaps and accepted limitations. Read before re-investigating a bug. |
| `docs/design/` | Static prototype (HTML + JSX) + screenshots used as the **visual reference**. **Read-only — never import from production code.** |

---

## Modular Decomposition (backend)

Each module is a bounded domain context, defined by an interface (`interfaces.ts`) and tested in isolation.

| Module | Responsibility |
|---|---|
| `identity/` | Authentication, sessions (JWT/OAuth2), user profiles, and **RBAC** for guest / host / admin. |
| `chef-onboarding/` | Host onboarding wizard data: profile, KYC document submission, food-safety declarations, and the **admin verification queue** state machine (pending → approved/rejected). |
| `events/` | Dining-event lifecycle: create / edit / publish / unpublish / cancel, capacity definition, scheduling. |
| `booking/` | **The most safety-critical module.** Seat availability, the booking lifecycle, and **concurrency-safe seat allocation** (see Hard Constraints). Source of truth for "is a seat actually still open." |
| `payments/` | Stripe integration: checkout, refunds, and host payouts (Stripe Connect). Never trust client-reported amounts. |
| `reviews/` | Post-event review submission, aggregation onto chef profiles, and admin moderation flags. |
| `notifications/` | Booking confirmations and host/guest messaging (non-realtime). |

---

## Booking Flow (the critical path)

Mirrors the project-book pseudocode. Treat overbooking as a correctness bug, never an edge case to paper over.

1. **Availability check** — read cached seat count (Redis) for a fast UI signal only; never authoritative.
2. **Reserve under transaction** — open a Postgres transaction, lock the event/seat rows (`SELECT … FOR UPDATE`), re-verify capacity inside the lock. If seats are gone, abort and surface the **Overbooking State** (suggest alternative dates for the same chef).
3. **Process payment** — charge via Stripe. On rejection, keep the user on checkout with inputs intact (**Payment Failed** state).
4. **Commit** — write the booking, decrement seats, and update the cache atomically with the transaction outcome.
5. **Confirm** — issue the booking confirmation (receipt, directions, itinerary) and notify the host.

---

## Never Generate

Absolute prohibitions — never produce these regardless of context:

- `.js` files in source — use strict TypeScript (`.ts` / `.tsx`) everywhere.
- `any` types without a justification comment explaining why strict typing can't apply.
- Direct database calls from Next.js server components — all data flows through the API proxy to the Fastify backend.
- `fetch` to the backend without an auth header where the route requires it.
- Hardcoded CSS colors / spacing outside Tailwind utilities and the design tokens. (Exception: the token definitions and keyframes themselves.)
- Seat decrements or booking writes **outside** a database transaction. (See Booking Flow.)
- Trusting a client-supplied price, seat count, role, or user id for any authorization or money decision.
- Committing `.env` or any hardcoded secret.
- `eval()`.

---

## Hard Constraints

### Architecture
- **Front/back separation:** Backend (`backend/`) never imports frontend code (`frontend/`), and vice versa. They communicate only over the REST API.
- **No overbooking, ever:** seat allocation is transactional and the `booking` module is the single source of truth. Redis is a cache, never the authority.
- **RBAC is enforced server-side:** a guest hitting a `/host` or `/admin` route is a **403** decided by the backend, not hidden by the frontend.
- **Trust & safety is a feature, not a checkbox:** KYC verification state, review integrity, and identity badges are first-class domain concerns.

### Tools & Libraries
- **Payments:** Stripe only.
- **UI:** Tailwind CSS, strict Atomic Design. No inline styles in production components (the `docs/design/` prototype uses inline styles — that is reference only).
- **Validation:** zod at every API boundary.
- **Jobs:** BullMQ on Redis.

### Code Style
- TypeScript 5.x, ESLint clean (`npm run lint`).
- **SOLID, DRY, KISS** by default. Interface-first modules; depend on abstractions, not implementations.
- Every backend module has a `__tests__/` folder; a task isn't done until its tests are updated.

---

## Design Language

Warm editorial "bistro" aesthetic — terracotta / olive / wine accents on cream paper, Bodoni Moda serif
display type, with a **Warm (default) / Dark** theme toggle. All color/spacing/type comes from design
tokens (CSS variables) ported from `docs/design/app/styles.css`. The prototype in `docs/design/app/`
(`shared.jsx`, `screens-*.jsx`) is the canonical visual reference for component structure and naming.

Atomic primitives already designed: `Icon`, `Logo`, `FoodImage`, `Avatar`, `Stars`, `SeatsMeter`,
`Price`, `Stepper`, `VerifiedPill`. Build these as **atoms/molecules** first, then compose screens.

---

## Page Map (from `docs/specs/Home_Dining_Platform_Pages_Spec.md`)

- **Public/Auth:** `/` · `/login` · `/signup` · `/trust-and-safety` · `/support`
- **Guest:** `/events` · `/events/:id` · `/chefs/:id` · `/checkout/:bookingId` · `/guest/dashboard` · `/guest/bookings/:id` · `/guest/reviews/new`
- **Host:** `/host/onboarding` · `/host/dashboard` · `/host/events` · `/host/events/create` · `/host/events/:id/guests` · `/host/earnings` *(`/host/ai-assistant` is out of scope — see above)*
- **Admin:** `/admin` · `/admin/verifications` · `/admin/users` · `/admin/moderation`
- **Edge states:** 404 · 403 · Overbooking · Payment Failed · Empty states

---

## Local Development (to be filled in as the scaffold lands)

```bash
# Backend (Fastify API)
cd backend && npm install && npm run dev

# Frontend (Next.js)
cd frontend && npm install && npm run dev

# Infrastructure (Postgres + Redis as Docker containers)
docker-compose up -d
```

> These commands are the intended shape; the scaffold, migrations, and `.env.example` are created in a later step.
> Update this section when the actual scripts exist.
