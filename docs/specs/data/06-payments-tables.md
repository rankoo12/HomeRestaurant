# Payments Tables

> Stripe *integration behavior* is Phase 6 (guest charges) and Phase 7 (host payouts). Phase 2 defines
> the ledger tables. **Money is integer minor units and never client-trusted.**

## `payments`  (1:1 with a booking)
The record of charging a guest for a booking.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `booking_id` | `UUID NOT NULL UNIQUE` → `bookings.id` ON DELETE RESTRICT | 1:1. |
| `status` | `payment_status NOT NULL DEFAULT 'pending'` | pending/succeeded/failed/refunded. |
| `amount_cents` | `INTEGER NOT NULL CHECK (amount_cents >= 0)` | What was charged. |
| `currency` | `TEXT NOT NULL DEFAULT 'usd'` | ISO 4217. |
| `stripe_payment_intent_id` | `TEXT UNIQUE` | Set once Stripe is wired (Phase 6). |
| `failure_reason` | `TEXT` | For the Payment-Failed state. |
| `created_at` / `updated_at` | `timestamptz` | |

**Index:** unique `booking_id`; unique `stripe_payment_intent_id`.

## `payouts`  (host earnings)
Money owed/sent to a chef, net of platform fee. Drives the `/host/earnings` screen.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `chef_id` | `UUID NOT NULL` → `chef_profiles.user_id` ON DELETE RESTRICT | |
| `booking_id` | `UUID` → `bookings.id` ON DELETE SET NULL | Source booking (nullable for aggregated payouts). |
| `gross_cents` | `INTEGER NOT NULL CHECK (gross_cents >= 0)` | Booking total attributable to the host. |
| `fee_cents` | `INTEGER NOT NULL CHECK (fee_cents >= 0)` | Platform fee withheld. |
| `net_cents` | `INTEGER NOT NULL CHECK (net_cents >= 0)` | Paid to the host (`gross − fee`). |
| `status` | `payout_status NOT NULL DEFAULT 'pending'` | pending/paid/failed. |
| `paid_at` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Index:** `chef_id`; `status`.

> Phase 2 seeds a few `paid` payouts so the earnings screen has content later. Stripe Connect transfer
> IDs are added when payouts go live (Phase 7).
