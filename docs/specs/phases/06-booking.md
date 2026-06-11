# Phase 6 — Booking & Payments

**Branch:** `phase-6-booking` · **Depends on:** Phases 3, 5 · **Status:** ✅ Complete — accepted deferrals documented in [docs/known-issues/phase-6-deferrals.md](../../known-issues/phase-6-deferrals.md)

## Objective
The system's critical path: concurrency-safe seat booking inside a DB transaction, Stripe checkout,
confirmation, and graceful handling of overbooking and payment failure. **Overbooking is a correctness
bug, not an edge case.**

## In scope
- `modules/booking`: transactional seat allocation (`SELECT … FOR UPDATE`, re-verify capacity in-lock), seat-hold lifecycle, booking records.
- `modules/payments`: Stripe checkout, webhook handling, charge-on-confirm, refunds on host cancel.
- `/checkout/:bookingId`: multi-step form (guest count, allergy declarations, payment).
- `/guest/bookings/:id`: confirmation/receipt + directions + itinerary.
- Edge states: **Overbooking** (abort + suggest alternative dates) and **Payment Failed** (keep inputs, prompt new card).
- Cache/DB consistency for seat counts.

## Out of scope
- Host payouts/Connect (Phase 7). Review submission (Phase 7).

## Requires specs
- [`docs/specs/booking-and-concurrency.md`](../booking-and-concurrency.md) ✅ — transactional allocation algorithm, seat-hold model + TTL, isolation level, overbooking-abort contract, idempotency.
- [`docs/specs/payments.md`](../payments.md) ✅ — Stripe checkout flow, webhook events, charge timing, failure handling, refund rules.

## Acceptance checklist
- [x] Seats allocated under row locks; capacity re-verified in-transaction. *(BookingService §6a/§6b; `findByIdForUpdate`.)*
- [x] Concurrent double-book is provably impossible (concurrency test included). *(last-seat race test: 8 parallel transactions, exactly one wins.)*
- [x] Card charged only once a seat is confirmed. *(webhook-only confirmation; LOST-SEAT path auto-refunds — payments.md F4.)*
- [x] Overbooking aborts cleanly and suggests alternatives for the same chef. *(409 INSUFFICIENT_SEATS + alternatives; surfaced in the booking widget.)*
- [x] Payment failure preserves user inputs and prompts for another card. *(inputs live on the booking record; checkout shows Payment-Failed state + retry while the hold lives.)*
- [x] Confirmation page + email issued; seat cache matches DB. *(Confirmation page ✅. Email: `NotificationService` seam wired on confirm with a log-backed sender; real delivery deferred to Phase 7 with the worker infra — accepted deferral. Seat cache: deliberately not built; discovery reads the DB directly, so cache/DB consistency holds vacuously.)*

## Accepted deferrals (documented, not blocking)
See [docs/known-issues/phase-6-deferrals.md](../../known-issues/phase-6-deferrals.md):
1. Email **delivery** (SMTP/provider + BullMQ worker) → Phase 7; the seam + payload ship now.
2. Hold sweeper runs as an in-process 5-min interval (hygiene only, correctness is query-time);
   migrates to BullMQ when Phase 7 adds worker infra.
3. Real-Stripe verification is a manual pre-merge checklist (`backend/README.md`); CI stays on
   `FakePaymentGateway` by design.
