# Booking Tables  — concurrency-critical

> **This is the no-overbooking foundation.** The booking *algorithm* (transaction, row locks) is Phase 6;
> Phase 2 must ship the table shapes + constraints that make overbooking **structurally impossible**, so
> the Phase 6 logic has guardrails it cannot violate by accident.

## `bookings`
A guest's reservation of N seats at an event.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `event_id` | `UUID NOT NULL` → `events.id` ON DELETE RESTRICT | Can't delete an event with bookings. |
| `guest_id` | `UUID NOT NULL` → `users.id` ON DELETE RESTRICT | The booker. |
| `seats` | `INTEGER NOT NULL CHECK (seats > 0)` | Seats reserved. |
| `status` | `booking_status NOT NULL DEFAULT 'pending'` | pending→confirmed→(cancelled/refunded). |
| `confirmation_code` | `TEXT UNIQUE NOT NULL` | "HR-9F2K" style, shown on the ticket. |
| `total_cents` | `INTEGER NOT NULL CHECK (total_cents >= 0)` | Charged amount (seats×price + fee). Server-computed, never client-supplied. |
| `created_at` / `updated_at` | `timestamptz` | |

**Indexes:** `event_id`; `guest_id`; unique `confirmation_code`.

**Partial unique guard (anti-double-book):** a guest shouldn't hold two *active* bookings for the same
event.
```sql
CREATE UNIQUE INDEX uniq_active_booking_per_guest_event
  ON bookings (event_id, guest_id)
  WHERE status IN ('pending', 'confirmed');
```

## `seat_holds`  — the transient concurrency primitive
A short-lived reservation of seats *while a guest is in checkout*, before payment confirms. This is what
stops two people paying for the last seat at once. Rows are ephemeral: created at checkout start,
consumed on confirm, released on abandon, expired by TTL.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `event_id` | `UUID NOT NULL` → `events.id` ON DELETE CASCADE | |
| `guest_id` | `UUID NOT NULL` → `users.id` ON DELETE CASCADE | |
| `seats` | `INTEGER NOT NULL CHECK (seats > 0)` | Held seats. |
| `status` | `seat_hold_status NOT NULL DEFAULT 'active'` | active/consumed/released/expired. |
| `expires_at` | `timestamptz NOT NULL` | TTL; a sweeper/queries treat past-due active holds as free. |
| `booking_id` | `UUID` → `bookings.id` ON DELETE SET NULL | Set when the hold is consumed into a booking. |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

**Indexes:** `(event_id, status)` for the availability query; `expires_at` for the sweeper.

**Active-hold guard:** at most one *active* hold per guest per event.
```sql
CREATE UNIQUE INDEX uniq_active_hold_per_guest_event
  ON seat_holds (event_id, guest_id)
  WHERE status = 'active';
```

## The availability identity (the rule everything serves)
At any instant, for an event:
```
bookable_seats = seats_total
               − seats_booked                          (confirmed)
               − Σ seats of active, non-expired holds  (in-flight checkouts)
```
Phase 6 computes this **inside a `SELECT … FOR UPDATE` transaction** and refuses to create a hold/booking
that would drive `bookable_seats` below zero. Phase 2's job: the `events.seats_booked` CHECK
(`<= seats_total`) and the unique active-hold/booking indexes above, so the data layer itself rejects an
inconsistent write even if application logic has a bug.
