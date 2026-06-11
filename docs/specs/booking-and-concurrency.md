# Booking & Concurrency — transactional seat allocation

> **Cross-cutting spec for Phase 6.** Authoritative definition of the booking lifecycle, the seat-hold
> model, and the concurrency-safe allocation algorithm. Companion to [payments.md](./payments.md)
> (charge timing, webhooks). Builds on the Phase 2 schema in
> [data/05-booking-tables.md](./data/05-booking-tables.md) and the invariants in
> [data/08-constraints-and-concurrency.md](./data/08-constraints-and-concurrency.md).
>
> **Status:** ✅ Authored — ready for review. Implementation begins only after this spec is approved.

---

## 1. Purpose

This spec defines the **authoritative booking and seat-allocation behavior** for Phase 6. Overbooking
is a correctness bug, never an edge case (root CLAUDE.md). Every rule below exists to make the
following statement provable: *two concurrent checkouts can never both win the last seat.*

The `booking` module is the **single source of truth** for "is a seat actually still open." Redis and
the discovery API give fast hints; only the transaction described in §6 decides.

## 2. Current state (what exists before Phase 6)

- Discovery (Phase 5) shows `seatsLeft = seats_total − seats_booked` on public reads
  ([discovery/01-events-read-api.md](./discovery/01-events-read-api.md)) — active holds are **not**
  subtracted there, by design.
- `seat_holds` exists in the schema (migration `0005`) with `expires_at`, status enum
  (active/consumed/released/expired), and the partial-unique active-hold guard — but **no code reads
  or writes it**.
- `BookingRepository` (`backend/src/modules/booking/`) is Phase-2 CRUD only: `create`, `findById`,
  `listByGuest`. It is not wired to any route.
- `withTransaction()` (`backend/src/db/transaction.ts`) is a plain BEGIN/COMMIT/ROLLBACK wrapper.
  **No `SELECT … FOR UPDATE` exists anywhere in the codebase yet.**
- The frontend booking widget is display-only (`onReserve={undefined}`); `/checkout/[bookingId]` is a
  placeholder.

## 3. Booking model (lifecycle)

A booking and its seat hold are created **together** in one transaction when the guest clicks
*Reserve*. The hold carries the seat reservation until payment confirms; the booking row carries
identity, money, and the checkout URL (`/checkout/:bookingId` per the pages spec).

```
 Reserve clicked                payment session         webhook: paid
        │                            │                       │
        ▼                            ▼                       ▼
  hold ACTIVE          hold extended to cover         hold CONSUMED
  booking PENDING ───► the Stripe session ──────────► booking CONFIRMED
        │                            │                seats_booked += seats
        │ TTL passes / cancel        │ session expires/cancelled
        ▼                            ▼
  hold EXPIRED/RELEASED        hold RELEASED
  booking CANCELLED            booking CANCELLED
```

| State | `seat_holds.status` | `bookings.status` | Counts against availability? |
|---|---|---|---|
| In checkout (form or paying) | `active`, `expires_at > now()` | `pending` | **Yes — via the hold** |
| Confirmed | `consumed` | `confirmed` | **Yes — via `seats_booked`** |
| Abandoned (TTL passed) | `active` but `expires_at <= now()` (later swept to `expired`) | `pending` (later swept to `cancelled`) | **No** |
| Cancelled pre-payment | `released` | `cancelled` | No |
| Refunded post-confirm | `consumed` | `refunded`, `seats_booked −= seats` | No |

Rules:
- A **live hold** is `status = 'active' AND expires_at > now()`. Status alone is never trusted —
  correctness must not depend on a sweeper having run (§5).
- `pending` bookings never count toward `seats_booked`; their live hold carries the reservation.
  Exactly one of {live hold, `seats_booked`} accounts for a reservation at any instant — never both,
  never neither (the confirm transaction swaps them atomically, §6).
- `confirmation_code` (`HR-XXXX`, unique) and `total_cents` are generated server-side at creation.
  `total_cents = seats × price_cents + service fee` (see [payments.md](./payments.md) §3 for the fee).
- Guest cancellation of a **confirmed** booking (refund path) is documented in
  [payments.md](./payments.md) §8 and is deliberately minimal in Phase 6.

## 4. Seat availability formula (authoritative)

For Phase 6 allocation decisions, availability is **always** computed as:

```
availableSeats = seats_total
               − seats_booked                                   (confirmed bookings only)
               − Σ seats of holds WHERE status = 'active'
                                    AND expires_at > now()       (live holds)
```

- `seats_booked` counts **confirmed** seats only. It is incremented exactly once, by the confirm
  transaction, and decremented only by refund/cancel of a confirmed booking.
- Live holds temporarily reduce availability; **expired holds are ignored by the query itself** —
  the `expires_at > now()` predicate, not a background job, is what frees abandoned seats.
- This formula is only meaningful when evaluated **inside the §6 transaction while holding the event
  row lock**. Evaluated anywhere else it is a hint.
- **Redis (or any cache) is a UI hint only. It is never read for an allocation decision.** (Restates
  [data/08-constraints-and-concurrency.md](./data/08-constraints-and-concurrency.md) §7 as a hard
  rule for Phase 6 code review.)
- The public discovery read keeps its Phase-5 formula (`seats_total − seats_booked`). Optionally it
  may adopt the full formula later; either way it remains non-authoritative.

## 5. Seat-hold behavior

**Creation** — only via `POST /api/bookings/hold` (§9), only inside the §6 transaction, only for a
`published` event whose host is not the requesting user, with `1 ≤ seats ≤ availableSeats`.

**One live hold per guest per event** — matches the existing DB guard
(`uniq_active_hold_per_guest_event`). The matching booking guard
(`uniq_active_booking_per_guest_event`) means: one in-flight checkout per guest per event, period.
Idempotency rules in §9 define what happens on repeat requests.

**TTL — 10 minutes** from hold creation. Chosen as the standard ticketing window: long enough to fill
in allergy declarations, short enough that abandoned checkouts don't starve a 10-seat dinner.
- The checkout UI shows a **countdown** sourced from the hold's `expires_at` (returned by the API).
- **Extension on payment start:** Stripe Checkout Sessions live ≥ 30 minutes (Stripe minimum). When
  the payment session is created, the same transaction extends the hold:
  `expires_at = now() + 35 min`, and the Stripe session is created with `expires_at = now() + 30 min`
  — the hold **always outlives the payment session**, so "paid but hold expired" is an exceptional
  path (§6 confirm fallback), not a routine one.
- **Expiry is query-time, not job-time.** A periodic sweeper (BullMQ, runs every ~5 min) flips
  past-due `active` holds to `expired` and their `pending` bookings to `cancelled` — **for hygiene
  and UX only**. Correctness never depends on the sweeper having run.

**Release** — guest cancels checkout (`POST /api/bookings/:id/cancel`) or starts a hold for different
seat count (§9): hold → `released`, booking → `cancelled`, in one transaction.

**Consumption** — only the confirm transaction (§6) moves a hold to `consumed`, simultaneously
incrementing `seats_booked` and setting the booking `confirmed`.

## 6. Transaction algorithm

All seat-affecting writes follow one protocol: **lock the event row first, then decide.** Every
writer serializes on that row, which is what makes the availability read consistent.

### 6a. Create hold (+ pending booking)

```text
BEGIN;                                                         -- READ COMMITTED (default)
  ev := SELECT id, status, chef_id, price_cents, seats_total, seats_booked
        FROM events WHERE id = $eventId
        FOR UPDATE;                                            -- the serialization point

  if ev missing or ev.status <> 'published'     -> ROLLBACK; 404 NOT_FOUND
  if ev.chef_id == $guestId                     -> ROLLBACK; 403 FORBIDDEN (host can't book own event)

  existing := SELECT * FROM seat_holds
              WHERE event_id = $eventId AND guest_id = $guestId AND status = 'active';
  if existing is live and existing.seats == $seats
                                                -> COMMIT; return existing booking (200, idempotent)
  if existing exists (live or stale)            -> mark it 'released'/'expired',
                                                   mark its booking 'cancelled'   (then continue)

  held := SELECT COALESCE(SUM(seats), 0) FROM seat_holds
          WHERE event_id = $eventId AND status = 'active' AND expires_at > now();
  available := ev.seats_total - ev.seats_booked - held;

  if $seats > available                         -> ROLLBACK; 409 INSUFFICIENT_SEATS (§8)

  total := $seats * ev.price_cents + serviceFee($seats * ev.price_cents);   -- server-computed
  booking := INSERT INTO bookings (event_id, guest_id, seats, status, confirmation_code, total_cents)
             VALUES (..., 'pending', generateCode(), total);
  hold    := INSERT INTO seat_holds (event_id, guest_id, seats, status, expires_at, booking_id)
             VALUES (..., 'active', now() + interval '10 minutes', booking.id);
COMMIT;  -> 201 { booking, hold }
```

### 6b. Confirm booking (driven by the payment webhook — see payments.md §4/§5)

```text
BEGIN;
  ev      := SELECT ... FROM events   WHERE id = $eventId   FOR UPDATE;   -- same lock, same order
  booking := SELECT ... FROM bookings WHERE id = $bookingId FOR UPDATE;

  if booking.status == 'confirmed'              -> COMMIT; no-op        (idempotent re-delivery)
  if booking.status in ('cancelled','refunded') -> goto LOST-SEAT path

  hold := SELECT * FROM seat_holds WHERE booking_id = $bookingId AND status = 'active';
  if hold is live:
      UPDATE seat_holds SET status = 'consumed' WHERE id = hold.id;
      UPDATE events SET seats_booked = seats_booked + booking.seats WHERE id = ev.id;
      UPDATE bookings SET status = 'confirmed' WHERE id = booking.id;
      COMMIT;  -> confirmed
  else:                                          -- hold expired/released but payment succeeded
      recompute available (formula §4, still under the lock);
      if booking.seats <= available:             -- grace path: seat is still free, honor the payment
          UPDATE events SET seats_booked = seats_booked + booking.seats;
          UPDATE bookings SET status = 'confirmed';
          (mark hold 'consumed' if the row still exists)
          COMMIT;  -> confirmed
      else:                                      -- LOST-SEAT: paid, but seats truly gone
          UPDATE bookings SET status = 'cancelled';
          COMMIT;  -> payments.md §4 marks the payment for refund
```

Notes:
- The `events` CHECK (`seats_booked <= seats_total`) remains the schema floor: even a buggy
  implementation of the above cannot persist an overbook.
- Lock ordering is fixed (`events` before `bookings`) for every writer — no deadlock cycles.
- Repositories receive the transaction client via the existing `Queryable` parameter; no repository
  method opens its own transaction. New interface methods (e.g. `SeatHoldRepository`,
  `BookingRepository.confirm`) follow the interface-first house pattern.

## 7. Isolation and locking

**Decision: PostgreSQL `READ COMMITTED` (default) + pessimistic row lock via `SELECT … FOR UPDATE`
on the event row.**

Why this and not the alternatives:
- **Not optimistic read-then-update:** under load, optimistic retries on the one contended row (an
  event near sellout) degenerate into livelock and make the "provably impossible" acceptance test
  probabilistic. The contended resource is narrow (one row per event); a pessimistic lock is cheap
  and absolute. (Matches the forward note in data/08 §7.)
- **Not SERIALIZABLE:** it would also be correct, but adds retry-on-serialization-failure complexity
  everywhere for no gain — the explicit event-row lock already serializes exactly the writers that
  must serialize, and nothing else.
- **Not Redis locks/counters:** Redis is a cache here, not a coordination primitive. A Redis-based
  decision can diverge from the DB and silently break the invariant. **Never read Redis for
  allocation** — enforced at code review via this spec.
- `withTransaction()` stays as-is (READ COMMITTED is the default); the lock lives in the SQL of the
  booking service, not in the helper. No isolation-level parameter is needed for Phase 6.

## 8. Overbooking behavior (the Overbooking edge state)

When §6a finds `requested > available` (or §6b hits the LOST-SEAT path):

- **Error code:** `INSUFFICIENT_SEATS` — added to the `ErrorCode` union in `backend/src/types/errors.ts`.
- **HTTP status:** `409 Conflict`.
- **Response shape** (extends the standard `{ error: { code, message } }` envelope with a typed
  `details` block):

```jsonc
{
  "error": {
    "code": "INSUFFICIENT_SEATS",
    "message": "Only 1 seat is still available for this dinner.",
    "details": {
      "eventId": "uuid",
      "requestedSeats": 4,
      "availableSeats": 1,
      "alternatives": [ EventListItem, ... ]   // up to 3 upcoming published events by the SAME chef
    }                                          // with availableSeats >= requestedSeats; may be []
  }
}
```

- Alternatives are computed **after** the transaction rolls back (plain read, reusing
  `EventRepository.listForDiscovery` filtered by chef) — never inside the lock.
- **Frontend behavior:** the event page / checkout surfaces the Overbooking state from the pages
  spec — clear "those seats just went" message, refreshed availability, and the alternative dinners
  as `EventCard`s. Inputs (seat count, allergy text) are preserved. It is a normal product state,
  not an error page.

## 9. Booking API contract (Phase 6 endpoints)

All endpoints require **authentication** (any role — hosts and admins may book as guests, except on
their own events). RBAC notes follow [identity/03-rbac.md](./identity/03-rbac.md); bodies are
zod-validated; errors use the standard envelope.

### `POST /api/bookings/hold`
Start a checkout: create the hold + pending booking (transaction §6a).

| | |
|---|---|
| Auth | authenticated; 403 `FORBIDDEN` if user is the event's chef |
| Body | `{ "eventId": "uuid", "seats": 1..8 }` (max party size 8, ≤ event capacity) |
| 201 | `{ "booking": Booking, "hold": { "expiresAt": iso8601 } }` |
| 200 | same shape — idempotent replay (live hold with identical `seats` already exists) |
| Errors | 400 `VALIDATION_ERROR` · 401 `UNAUTHENTICATED` · 403 `FORBIDDEN` · 404 `NOT_FOUND` (event missing/unpublished) · 409 `INSUFFICIENT_SEATS` (§8) |
| Idempotency | same guest + event + same seats → returns the existing live hold/booking (200). Same guest + event + **different** seats → old hold released + old booking cancelled + new pair created atomically (201). The DB partial-unique indexes are the structural backstop. |

### `GET /api/bookings/:bookingId`
Fetch one booking (checkout page + confirmation page data).

| | |
|---|---|
| Auth | authenticated; owner only (admin allowed) — others get 404 `NOT_FOUND` (not 403; don't leak existence) |
| 200 | `{ "booking": Booking, "hold": { "status", "expiresAt" } \| null, "payment": { "status", "failureReason" } \| null, "event": EventListItem }` |
| Errors | 401 · 404 |
| Idempotency | read-only |

### `POST /api/bookings/:bookingId/cancel`
Abandon checkout before payment, or void an unpaid booking.

| | |
|---|---|
| Auth | authenticated; owner only (admin allowed) |
| Body | none |
| 200 | `{ "booking": Booking }` (status `cancelled`; hold `released`) |
| Errors | 401 · 404 · 409 `VALIDATION_ERROR` if booking is already `confirmed` (confirmed-cancel = refund path, [payments.md](./payments.md) §8 — not this endpoint in Phase 6) |
| Idempotency | cancelling an already-cancelled booking returns 200 with current state (no-op) |

### Confirmation is **not** a client endpoint
There is deliberately no `POST /api/bookings/:id/confirm` callable by the browser: confirmation is
driven exclusively by the verified Stripe webhook ([payments.md](./payments.md) §5) running
transaction §6b. A client-callable confirm would trust the client about payment — prohibited
(CLAUDE.md: never trust client-reported amounts). The checkout/confirmation page **polls
`GET /api/bookings/:bookingId`** after returning from Stripe until status leaves `pending`.

Payment-session creation (`POST /api/bookings/:bookingId/checkout-session`) is specified in
[payments.md](./payments.md) §4.

## 10. Test plan (written before coding; part of the phase's definition of done)

Integration tests (real Postgres, `test:integration` suite) in `modules/booking/__tests__/`:

1. **Last-seat race (the headline test):** event with 1 seat left; N=8 parallel `hold` transactions
   (separate connections, `Promise.all`). Assert exactly **one** succeeds, the rest get
   `INSUFFICIENT_SEATS`, and the availability identity holds afterwards.
2. **Two-user final-seat race via API:** two authenticated agents POST `/api/bookings/hold`
   concurrently for the last seat → one 201, one 409 with correct `details`.
3. **Expired hold frees seats without a sweeper:** create a hold, set `expires_at` in the past via
   SQL, run no sweeper; a second guest's hold for the same seats **succeeds**; confirming the stale
   hold's booking takes the §6b fallback (grace if seats free, else LOST-SEAT).
4. **Hold idempotency:** same guest repeats `hold` with same seats → 200, same `bookingId`, one
   active hold in DB. With different seats → old released/cancelled, new created, guards never
   violated.
5. **Requested > available:** seats=5 when 3 remain → 409, `availableSeats: 3`, alternatives list
   shape correct (and empty when the chef has no other events).
6. **Confirm is atomic and idempotent:** running §6b twice for the same booking increments
   `seats_booked` exactly once; hold ends `consumed`; replay is a no-op.
7. **Cancel releases capacity:** hold → cancel → availability restored; cancel replay is a no-op.
8. **No-cache assertion (static):** allocation code path contains no Redis reads — enforced by code
   review + a unit test that the booking service has no cache dependency injected.
9. **Schema floor:** direct SQL attempt to push `seats_booked > seats_total` still fails (existing
   constraint test, kept green).

Sweeper tests (hygiene job): flips only past-due `active` holds; never touches live ones; cancelling
the linked `pending` booking is idempotent.

---

*Out of scope here:* Stripe session mechanics, webhook verification/idempotency, refund execution,
payment-failure UX — all defined in [payments.md](./payments.md). Host-side cancellations/refund
batches: Phase 7.
