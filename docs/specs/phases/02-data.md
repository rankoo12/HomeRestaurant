# Phase 2 — Database & Domain Model

**Branch:** `phase-2-data` · **Depends on:** Phase 1 · **Status:** 📝 Not started

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
- `docs/specs/database-schema.md` *(to author this phase)* — ERD and table definitions: Users, Chefs (host profiles), Events, EventSchedules, Bookings, SeatHolds, Reviews, Verifications, Payments, Payouts. Relationships, indexes, and the concurrency-relevant constraints.

## Acceptance checklist
- [ ] Migrations run forward cleanly on a fresh DB.
- [ ] Seed populates demo chefs/events/reviews.
- [ ] Repository unit tests pass against a test DB.
- [ ] Constraints prevent negative capacity and duplicate active seat holds.
