# Phase 2 — Database & Domain Model

**Branch:** `phase-2-data` · **Depends on:** Phase 1 · **Status:** ✅ Complete

## Objective
Design and migrate the full relational schema; provide typed domain entities and repository interfaces;
seed demo data mirroring the design prototype so later UI phases have realistic content.

## In scope
- Migrations for all core tables (see required schema spec).
- Repository interfaces + implementations in the relevant `modules/*` folders (read/write, transaction-aware).
- Seed script reproducing the `docs/design/app/data.jsx` chefs/events/reviews.
- DB-level constraints that booking will rely on (capacity ≥ 0, unique active seat holds, FK integrity).

## Out of scope
- HTTP endpoints beyond a thin proof, auth, payments. No UI.

## Requires specs
- [`docs/specs/data/`](../data/00-index.md) *(✅ authored)* — the **data spec tree**, split by domain:
  ERD overview, identity, chef, events, booking (concurrency-critical), payments, reviews, and the
  cross-cutting constraints & concurrency invariants. Read `data/00-index.md` first.

## Acceptance checklist
- [x] Migrations run forward cleanly on a fresh DB. *(verified: dropped + recreated both DBs, 7 migrations applied; runner is idempotent.)*
- [x] Seed populates demo chefs/events/reviews. *(4 chefs, 6 events, 4 guests, 4 reviews, 3 payouts — ported from `docs/design/app/data.jsx`.)*
- [x] Repository integration tests pass against a test DB. *(11 tests across events, chef, and constraints suites.)*
- [x] Constraints prevent overbooking and duplicate active seat holds. *(DB-enforced: `seats_booked ≤ seats_total` CHECK + partial-unique active-hold/booking indexes, all tested.)*

## What shipped
- **Spec tree:** [`docs/specs/data/`](../data/00-index.md) (9 files).
- **DB layer:** `src/db/` — typed pool, `withTransaction` helper, forward-only migration runner.
- **Migrations:** `src/db/migrations/0001..0007` — extensions, enums, all 12 tables, `chef_stats` view, constraints.
- **Types:** `src/types/` — domain entities + enums per domain, mirroring the schema.
- **Repositories:** interface-first per module (identity, chef-onboarding, events, booking, payments, reviews), each transaction-aware.
- **Scripts:** `db:migrate`, `db:seed` (idempotent), plus `test:integration`.

## Notes
- Fixed a latent Phase-1 bug: `npm test` lacked `--experimental-vm-modules`, so ts-jest ESM tests silently failed to run. Now wired via `cross-env`; CI runs tests from Phase 2 on.
- `chef_stats` rating/counts are a **VIEW** (derived, never drift). `dinners_hosted` counts `completed` events (0 for seed data, which is all `published`).
- Migrations are `.sql` files read at runtime via `tsx`; `npm run build` doesn't copy them to `dist/`. Fine for current `db:migrate` (tsx) usage; revisit if we ever migrate from compiled output.
