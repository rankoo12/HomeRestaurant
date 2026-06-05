# Phase 6 — Booking & Payments

**Branch:** `phase-6-booking` · **Depends on:** Phases 3, 5 · **Status:** 📝 Not started

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
- `docs/specs/booking-and-concurrency.md` *(to author this phase)* — transactional allocation algorithm, seat-hold model + TTL, isolation level, overbooking-abort contract, idempotency.
- `docs/specs/payments.md` *(to author this phase — guest side)* — Stripe checkout flow, webhook events, charge timing, failure handling, refund rules.

## Acceptance checklist
- [ ] Seats allocated under row locks; capacity re-verified in-transaction.
- [ ] Concurrent double-book is provably impossible (concurrency test included).
- [ ] Card charged only once a seat is confirmed.
- [ ] Overbooking aborts cleanly and suggests alternatives for the same chef.
- [ ] Payment failure preserves user inputs and prompts for another card.
- [ ] Confirmation page + email issued; seat cache matches DB.
