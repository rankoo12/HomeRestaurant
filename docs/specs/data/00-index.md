# Data Layer — Spec Tree

> The database & domain-model specs for **Phase 2**. Split by domain so the schema is browsable one
> concern at a time. Read [`01-erd-overview.md`](./01-erd-overview.md) first for the big picture, then
> the per-domain files. Cross-cutting invariants live in
> [`08-constraints-and-concurrency.md`](./08-constraints-and-concurrency.md).

## Map

| Spec | Covers |
|---|---|
| [01-erd-overview.md](./01-erd-overview.md) | All entities + relationships, the ID/PK + slug strategy, naming & type conventions, the ERD diagram. |
| [02-identity-tables.md](./02-identity-tables.md) | `users` (auth + role). Session storage is Redis (Phase 3) — noted, not tabled here. |
| [03-chef-tables.md](./03-chef-tables.md) | `chef_profiles` (1:1 with a host user), `chef_verifications`, `chef_badges`. |
| [04-events-tables.md](./04-events-tables.md) | `events`, `event_courses`, `event_tags`. Capacity + scheduling fields. |
| [05-booking-tables.md](./05-booking-tables.md) | `bookings`, `seat_holds`. **Concurrency-critical** — the no-overbooking foundation. |
| [06-payments-tables.md](./06-payments-tables.md) | `payments`, `payouts`. Money is never client-trusted. |
| [07-reviews-tables.md](./07-reviews-tables.md) | `reviews` + the derived `chef_stats` view (rating / counts). |
| [08-constraints-and-concurrency.md](./08-constraints-and-concurrency.md) | The invariants every table upholds: capacity ≥ 0, unique active seat holds, FK integrity, enums. |

## Phase-2 scope reminder
Schema + migrations + typed entities + repositories + seed. **No HTTP endpoints, auth, or payments
logic** — those are later phases. This spec tree defines the *shape of the data*; behavior comes later.

## Decisions locked for Phase 2
- **Identity vs. host:** one `users` table for everyone; host-only fields live in a 1:1 `chef_profiles`.
- **IDs:** `UUID` primary keys (non-enumerable) + a separate unique `slug` column for human URLs.
- **Aggregates (rating, review count, dinners hosted):** **derived** via a `chef_stats` view — never drift.
- **Migrations:** plain, ordered, forward-only `.sql` files run by a small TS runner (`db:migrate`).
- **Money:** stored as integer **minor units** (cents), never floats.
- **Timestamps:** `timestamptz`, UTC, `created_at` / `updated_at` on every mutable table.
