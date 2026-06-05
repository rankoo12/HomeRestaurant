# Constraints & Concurrency — the invariants

> The cross-cutting rules every table upholds. These are **database-enforced** so a logic bug in any
> later phase cannot corrupt the data. Phase 2's correctness bar is: *the schema rejects an invalid state
> even if the application tries to write one.*

## 1. No overbooking (the headline invariant)
Two layers of defense, both in the DB:

1. **Bounded confirmed seats** — on `events`:
   `CHECK (seats_booked >= 0 AND seats_booked <= seats_total)`.
   No transaction can confirm more seats than exist; the row write fails first.
2. **At most one active hold/booking per guest per event** — partial unique indexes
   (`uniq_active_hold_per_guest_event`, `uniq_active_booking_per_guest_event`). Stops a single guest from
   racing themselves into duplicates.

The *availability identity* (`bookable = seats_total − seats_booked − active holds`) is evaluated by the
Phase 6 booking transaction under `SELECT … FOR UPDATE` on the event row. Phase 2 guarantees the floor:
even a buggy transaction can't persist `seats_booked > seats_total`.

## 2. Referential integrity & delete policy
| Relationship | ON DELETE | Rationale |
|---|---|---|
| `chef_profiles → users` | CASCADE | Removing a user removes their host profile. |
| `events → chef_profiles` | CASCADE | Host gone ⇒ their events go. |
| `bookings → events` | **RESTRICT** | Never delete an event that has bookings (financial/audit record). |
| `bookings → users (guest)` | **RESTRICT** | Preserve the booking history. |
| `payments → bookings` | RESTRICT | A payment must always point at its booking. |
| `seat_holds → events/users` | CASCADE | Transient rows; safe to clear. |
| `reviews → events/chef` | CASCADE | Reviews belong to their event/chef. |
| `reviews → author` | RESTRICT | Keep authored content attributable. |

## 3. Value constraints (CHECKs)
- Money: every `*_cents` column `>= 0`. `payouts.net_cents = gross − fee` is maintained by the writer
  (Phase 7) with all three `>= 0`.
- `events.price_cents >= 0`, `seats_total > 0`, `duration_minutes > 0`.
- `bookings.seats > 0`, `seat_holds.seats > 0`.
- `reviews.rating BETWEEN 1 AND 5`.

## 4. Enums (closed sets)
All status-like columns use Postgres `ENUM` types (listed in
[01-erd-overview.md](./01-erd-overview.md)), not free text — invalid states are unrepresentable.

## 5. Timestamps
`created_at`/`updated_at` are `timestamptz DEFAULT now()`. A shared trigger function `set_updated_at()`
bumps `updated_at` on UPDATE for every mutable table.

## 6. Extensions required
- `pgcrypto` — `gen_random_uuid()`.
- `citext` — case-insensitive `users.email`.
Both enabled in the first migration.

## 7. Concurrency posture (forward note for Phase 6)
- Seat allocation: pessimistic lock on the **event row** (`SELECT … FOR UPDATE`), re-check availability,
  then write. Chosen over optimistic retry because the contended resource (one event's seats) is narrow
  and correctness must be absolute.
- `seat_holds.expires_at` lets availability queries discount stale holds without a sweeper; a periodic
  job (Phase 6) flips expired `active` → `expired` for hygiene.
- Redis cache of seat counts is a **UI hint only** — never read for an allocation decision.
