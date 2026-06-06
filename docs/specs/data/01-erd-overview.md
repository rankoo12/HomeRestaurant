# ERD Overview

> The whole data model at a glance. Per-table detail is in the sibling specs.

## Entities & relationships

```
users ─────1:1──── chef_profiles ───1:N─── events ───1:N─── bookings ───1:1─── payments
  │                     │                     │                  │
  │                     ├─1:N─ chef_verifications                ├─1:N─ seat_holds (transient)
  │                     ├─1:N─ chef_badges                       │
  │                     └──── chef_stats (VIEW, derived)         │
  │                                                              │
  └─────────────────── (guest) ────────1:N──────────────────────┘
  │
  └─1:N─ reviews ──N:1── events     payouts ──N:1── chef_profiles
          reviews ──N:1── chef_profiles
```

- A **user** has a `role` ∈ {guest, host, admin}. Everyone is a user.
- A **host** user has exactly one **chef_profile** (1:1, PK = `user_id`). Guests/admins have none.
- A **chef_profile** owns many **events**; each event has many **bookings** by guest users.
- A **booking** belongs to one guest user and one event, and has one **payment**.
- **seat_holds** are short-lived rows that reserve seats *during* checkout (Phase 6 uses them; Phase 2
  defines the table + constraints). They are the concurrency primitive that prevents overbooking.
- **reviews** link a guest user → event (and denormalize `chef_id` for fast profile aggregation).
- **chef_stats** is a **VIEW**, not a table: rating, review_count, dinners_hosted are computed live.

## ID / key strategy
- Every table's PK is `id UUID DEFAULT gen_random_uuid()` (via `pgcrypto`), except `chef_profiles`
  whose PK **is** `user_id` (enforces the 1:1).
- Tables exposed in URLs (`events`, `chef_profiles`) also carry a unique **`slug`** (`jollof-sunday`,
  `amara`) — human-readable, stable, decoupled from the internal UUID.
- All foreign keys reference UUIDs and declare explicit `ON DELETE` behavior (see per-table specs).

## Conventions
| Concern | Rule |
|---|---|
| Table names | `snake_case`, plural (`chef_profiles`, `seat_holds`). |
| Columns | `snake_case`. Booleans prefixed `is_`/`has_` where it reads better. |
| Money | integer **minor units** (`price_cents INTEGER`), never float/numeric-with-decimals for currency. |
| Time | `timestamptz`, UTC. `created_at`, `updated_at` on every mutable table (trigger keeps `updated_at`). |
| Enums | Postgres `ENUM` types for closed sets (role, booking_status, verification_status, payment_status). |
| Deletes | Prefer soft state (`status`) over hard deletes for domain rows; hard-delete only transient rows (`seat_holds`). |

## Core enums (defined once, in the first migration)
- `user_role`: `guest` · `host` · `admin`
- `event_status`: `draft` · `published` · `unpublished` · `cancelled` · `completed`
- `booking_status`: `pending` · `confirmed` · `cancelled` · `refunded`
- `seat_hold_status`: `active` · `consumed` · `released` · `expired`
- `verification_status`: `pending` · `approved` · `rejected`
- `payment_status`: `pending` · `succeeded` · `failed` · `refunded`
- `payout_status`: `pending` · `paid` · `failed`

These enum value sets are the single source of truth — the TS domain types in `backend/src/types`
mirror them exactly, and zod schemas validate against them at the boundary.
