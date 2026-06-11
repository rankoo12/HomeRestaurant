# Payments — Stripe checkout, webhooks, failure & refund handling

> **Cross-cutting spec for Phase 6 (guest side).** Defines how a held booking gets paid, how Stripe
> tells us about it, and what happens when it doesn't. Companion to
> [booking-and-concurrency.md](./booking-and-concurrency.md) (hold lifecycle, confirm transaction §6b)
> and the ledger tables in [data/06-payments-tables.md](./data/06-payments-tables.md).
>
> **Status:** ✅ Authored — ready for review. Implementation begins only after this spec is approved.

---

## 1. Purpose

This spec defines the **Stripe payment behavior for Phase 6**: integration mode, the exact ordering
of payment vs. seat confirmation, webhook handling with idempotency, the payment state machine, the
Payment-Failed edge state, and the (deliberately minimal) refund scope. Money is integer minor units
(`*_cents`), is computed server-side, and is **never client-trusted** (root CLAUDE.md).

## 2. Scope boundary

| In Phase 6 (this spec) | Phase 7+ (out of scope here) |
|---|---|
| Guest checkout: pay for a held booking | Host payouts / Stripe **Connect** (transfers, account linking) |
| Webhook-driven booking confirmation | Payout reversal accounting on refunds |
| Payment-Failed edge state | Self-service guest refund flows & policy windows |
| Refund **execution primitive** for the lost-seat case (§4) and admin/host-cancel (minimal) | Bulk/host-initiated cancellation flows, earnings dashboards |

`payouts` rows continue to be written only by seeds in Phase 6; no payout logic ships in this phase.

## 3. Stripe integration choice

**Decision: Stripe Checkout Session (hosted checkout), `mode: 'payment'`.**

Justification:
- **No card UI to build or secure.** The card form, 3-D Secure, wallets, and retry-on-decline UX are
  Stripe-hosted — the heaviest and riskiest UI of the phase disappears. PCI burden stays at SAQ-A.
- **No frontend Stripe dependency.** The browser only follows a redirect URL; no publishable key, no
  `@stripe/*` packages in `frontend/package.json` (keeps the dependency budget per CLAUDE.md §6).
- **PaymentIntent + custom Elements UI** would only be justified by a fully custom in-page card form.
  The pages spec's `/checkout/:bookingId` "multi-step form (guest count, allergy declarations,
  payment)" is satisfied with steps 1–2 on our page and the payment step on Stripe's page.
- A `PaymentIntent` still exists *inside* the session (Stripe creates it); its id is what we store in
  `payments.stripe_payment_intent_id`, exactly as the Phase 2 schema anticipated.

Amounts: the session is created with `amount = bookings.total_cents` (already server-computed at hold
time: `seats × price_cents + service fee`). **Service fee = 10%** of the seat subtotal, rounded —
matching the rate already displayed by `BookingCard` (`serviceFeeRate = 0.1`); defined server-side as
a config constant (`SERVICE_FEE_RATE`, §9) so UI and charge can never disagree. Currency: `usd`
(schema default).

## 4. Payment / booking ordering (the flow)

The UI already promises *"You won't be charged until confirmed"* — and the booking spec confirms
seats only on verified payment. Resolution: **charge first at Stripe, confirm seats in the webhook
transaction immediately after** — the guest is never charged for a seat we then fail to deliver
without an automatic refund (§4, failure F4).

```
1. Hold + pending booking exist            (booking-and-concurrency.md §6a)
2. POST /api/bookings/:bookingId/checkout-session
     - auth: owner; booking must be 'pending' with a live hold (else 409)
     - in ONE transaction: extend hold to now()+35min  (booking spec §5)
     - create payments row: status 'pending', amount = booking.total_cents
     - create Stripe Checkout Session:
         expires_at  = now()+30min
         metadata    = { bookingId, eventId, guestId }
         success_url = {SITE}/guest/bookings/{bookingId}?paid=1
         cancel_url  = {SITE}/checkout/{bookingId}?cancelled=1
     - store session.payment_intent → payments.stripe_payment_intent_id
     - 200 { "url": session.url }            → browser redirects to Stripe
3. Guest pays on Stripe's hosted page
4. Stripe → POST /api/payments/webhook  (checkout.session.completed)
     - verify signature, dedupe event (§5)
     - payments.status := 'succeeded'
     - run confirm transaction (booking spec §6b): consume hold,
       seats_booked += seats, booking := 'confirmed'
     - enqueue confirmation email (notifications module, BullMQ) — fire-and-forget
5. Browser lands on success_url; the page POLLS GET /api/bookings/:id
   until status = 'confirmed' (the webhook is the authority, not the redirect)
```

**Failure modes, explicitly:**

| # | Failure | Handling |
|---|---|---|
| F1 | Card declined on Stripe's page | Stripe lets the guest retry in-place; nothing reaches us until success or session end. No state change on our side. |
| F2 | Guest clicks back / `cancel_url` | Booking stays `pending`, hold stays live until TTL; checkout page shows Payment-Failed state (§7) with retry. |
| F3 | Session expires unpaid (30 min) | Webhook `checkout.session.expired` → payment `failed` (reason `session_expired`), release hold, cancel booking. Hold TTL (35 min) is the no-webhook backstop. |
| F4 | **Paid, but seats gone** (hold lapsed + capacity claimed — rare by construction, §5 of booking spec) | Confirm transaction takes the LOST-SEAT path → booking `cancelled`; this spec then **auto-refunds**: `stripe.refunds.create({ payment_intent })`, payment → `refunded`. Guest sees the Overbooking state with alternatives. If the refund API call itself fails, payment stays `succeeded` with booking `cancelled` — surfaced by an admin alert/log for manual compensation (the state pair is the queryable inconsistency flag). |
| F5 | Webhook delivered but our DB transaction fails | We return 5xx → Stripe retries with backoff (up to ~3 days). Handler idempotency (§5) makes the retry safe. |
| F6 | Webhook never arrives | Booking stays `pending`; hold expires; sweeper cancels. A `succeeded` charge with a `pending` booking older than the session window is included in the admin alert query from F4. |

## 5. Webhooks

**Endpoint:** `POST /api/payments/webhook` — public (no JWT; Stripe can't log in), **excluded from
the JSON body parser**: signature verification requires the raw request body (Fastify raw-body
config on this route only).

**Events handled** (everything else: acknowledged 200 and ignored):

| Event | Action |
|---|---|
| `checkout.session.completed` | payment → `succeeded`; run confirm transaction (booking spec §6b); enqueue email |
| `checkout.session.expired` | payment → `failed` (`failure_reason = 'session_expired'`); release hold; cancel pending booking |
| `payment_intent.payment_failed` | record `failure_reason` (last decline message) on the payment row; no booking state change (F1 — guest may still retry within the session) |

**Signature verification:** `stripe.webhooks.constructEvent(rawBody, signatureHeader,
STRIPE_WEBHOOK_SECRET)`. Invalid signature → `400` and **no** processing. There is no other
authentication path into this endpoint.

**Idempotency — two layers (both required):**
1. **Event ledger (strict dedupe).** New table via a new, additive migration
   `0008_stripe_webhook_events.sql` (no existing migration is modified):
   ```sql
   CREATE TABLE stripe_webhook_events (
     id           TEXT PRIMARY KEY,          -- Stripe event id ("evt_…")
     type         TEXT NOT NULL,
     processed_at timestamptz NOT NULL DEFAULT now()
   );
   ```
   The handler `INSERT`s the event id **inside the same transaction** as its effects; a duplicate
   delivery hits the PK conflict → respond 200, do nothing. (In-transaction insert means "processed"
   and "effects committed" are atomic — no lost or double processing.)
2. **State-machine guards (defense in depth).** Every transition is a no-op when already in the
   target state: confirm on a `confirmed` booking does nothing (booking spec §6b), `succeeded` →
   `succeeded` does nothing. Even with a wiped ledger, replays cannot double-confirm or
   double-count seats.

**Out-of-order delivery:** transitions are guarded by current state, not by event arrival order —
e.g. `payment_intent.payment_failed` arriving after `checkout.session.completed` only annotates
`failure_reason` on an already-`succeeded` payment and is otherwise ignored; `expired` after
`completed` is a no-op because the booking is no longer `pending`. Rule: **an event may only move a
record forward from the exact state it expects; otherwise log + 200.**

**Response discipline:** 200 = processed or safely ignored; 400 = bad signature; 5xx = transient
failure, *please retry* (F5). Never 200 on a failed transaction.

## 6. Payment state machine

`payment_status` enum (exists since migration 0001): `pending → succeeded | failed`, `succeeded →
refunded`. No other transitions.

| Payment status | Set by | Booking status it implies | Notes |
|---|---|---|---|
| `pending` | checkout-session creation (§4 step 2) | `pending` | exactly one payments row per booking (DB unique `booking_id`) |
| `succeeded` | `checkout.session.completed` webhook | `confirmed` — or `cancelled` momentarily in F4 until the refund lands | the *only* trigger for seat confirmation |
| `failed` | `checkout.session.expired` (terminal) / annotated by `payment_intent.payment_failed` | `pending` (until hold TTL) → `cancelled` | `failure_reason` populated for the UX (§7) |
| `refunded` | refund execution (F4 / §8) | `refunded` (post-confirm refund) or `cancelled` (F4 never-confirmed) | refund id logged; payout interaction is Phase 7 |

A booking is `confirmed` **iff** its payment is `succeeded` and the confirm transaction committed.
There is no path to `confirmed` that bypasses a verified webhook.

## 7. Payment failure UX (the Payment-Failed edge state)

Per the pages spec: *"Stay on checkout, surface error, preserve inputs."*

- **Card declined (F1):** handled on Stripe's page — guest retries there with another card. Our app
  is not involved.
- **Returned via `cancel_url` / session expired (F2, F3):** `/checkout/:bookingId` renders the
  Payment-Failed state:
  - the booking's `failure_reason` (from `GET /api/bookings/:id`'s `payment` block) shown as a
    human message ("Your payment didn't go through — no charge was made");
  - **all inputs preserved** — seat count and allergy declarations live on the booking record
    server-side, so a page reload loses nothing;
  - **hold countdown still visible**: while the hold is live the guest can retry — "Try another
    card" simply calls `POST …/checkout-session` again (new session, same booking; the old
    `pending`/`failed` payment row is updated, not duplicated — unique `booking_id` makes one row
    the invariant);
  - if the hold has lapsed, the retry re-runs hold creation first (booking spec §9 idempotency) —
    seats permitting; otherwise the Overbooking state with alternatives.
- The guest is **never** shown a generic 500 for a payment problem; every reachable failure has a
  state above.

## 8. Refund policy (Phase 6 scope — deliberately minimal)

**No self-service guest refund system ships in Phase 6.** What ships:

1. **Automatic refund on lost-seat (F4)** — mandatory, fully automated, because the alternative is
   keeping money for an undelivered seat.
2. **Refund primitive** in the payments module: `refundPayment(bookingId)` → full Stripe refund via
   `payment_intent`, payment → `refunded`, booking → `refunded`, `seats_booked −= seats` (inside the
   §6b-style locked transaction). Idempotent (refunding a `refunded` payment is a no-op).
3. **Admin/host-triggered full refund** uses that primitive — exposed in Phase 7/8 UIs (host cancel,
   admin moderation), not in any Phase 6 page.

**Documented but deferred (Phase 7 decision):** guest-initiated cancellation windows (e.g. full
refund ≥ 48h before the event), partial refunds, and payout clawback when a refunded booking already
generated a payout. Until then, `bookings.status = 'refunded'` is reachable only via the primitive
above. *(Open question for the product owners: the guest cancellation window — see review notes.)*

## 9. Environment variables & dev/CI strategy

Additions to `backend/.env.example` and the zod env schema (`backend/src/config/env.ts`) — required
in `development`/`production`, optional in `test` (same pattern as `DATABASE_URL`):

| Var | Meaning |
|---|---|
| `STRIPE_SECRET_KEY` | Secret API key (`sk_test_…` locally — **test mode only** in dev) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`; from `stripe listen` locally) |
| `SERVICE_FEE_RATE` | default `0.10` — single source of truth for the fee (§3) |
| `CHECKOUT_RESULT_BASE_URL` | base for success/cancel URLs; defaults to `CORS_ORIGIN` |

No frontend env additions (hosted Checkout needs no publishable key).

**Interface-first seam (house rule):** the payments module defines a `PaymentGateway` interface
(`createCheckoutSession`, `refundPayment`, `verifyWebhookSignature`); `StripePaymentGateway`
implements it with the `stripe` SDK (new backend dependency — added to `package.json` before any
import, per the pre-implementation protocol). Tests inject a `FakePaymentGateway`.

**Local development:** Stripe test mode + `stripe listen --forward-to localhost:4000/api/payments/webhook`.
Documented in the backend README as part of Phase 6.

**CI / default test suite:** runs **without any Stripe keys or network** — all unit/integration
tests use `FakePaymentGateway` and synthesized webhook payloads (signature check faked through the
interface). Real-Stripe-test-mode verification is a **manual, optional** checklist item before the
phase merges; CI must never depend on Stripe availability.

## 10. Test plan (written before coding; part of the phase's definition of done)

In `modules/payments/__tests__/` (FakePaymentGateway throughout; real Postgres for integration):

1. **Successful checkout end-to-end:** hold → session created (payment `pending`, intent id stored,
   hold extended) → synthesized `checkout.session.completed` → payment `succeeded`, booking
   `confirmed`, `seats_booked` incremented exactly once, email job enqueued.
2. **Failed payment / session expired:** synthesized `checkout.session.expired` → payment `failed`
   with reason, hold `released`, booking `cancelled`, capacity restored.
3. **Repeated webhook delivery:** same event id delivered 3× → one ledger row, one confirmation,
   `seats_booked` incremented once, responses 200 each time.
4. **Webhook after hold expiration:** force-expire the hold, deliver `completed` → grace path
   confirms if seats remain; with seats gone → booking `cancelled` **and** refund issued (payment
   `refunded`) — the F4 contract.
5. **Webhook for unknown booking / unknown event id metadata:** logged, 200, no state change, no
   throw.
6. **Confirmation failure after payment (F5):** make the confirm transaction throw → handler
   returns 5xx, **ledger row not committed**; redelivery then succeeds exactly once.
7. **Bad signature:** 400, nothing processed, no ledger row.
8. **Out-of-order events:** `payment_intent.payment_failed` after `completed` → annotation only;
   `expired` after `completed` → no-op.
9. **Refund primitive:** full refund flips payment → `refunded`, booking → `refunded`,
   `seats_booked −= seats`; second call is a no-op; refund of a `pending` payment is rejected.
10. **No double charge:** retry of `POST …/checkout-session` for the same booking updates the single
    payments row (unique `booking_id`) and voids/abandons the previous session — never two live
    sessions charging one booking.
11. **Amount integrity:** session amount always equals `bookings.total_cents`; a tampered
    client-side amount is impossible by construction (amount never read from the request).

---

## 11. Host payouts — Phase 7 addendum (ledger records only)

*Authored at Phase 7 spec time, per the master plan's "payments.md (host side)" requirement.*

**Scope decision: Phase 7 ships payout *ledger records*, not money movement.** Stripe **Connect**
(account linking, transfers) requires per-host onboarded Stripe accounts — out of scope for the
university project unless explicitly re-scoped (open question below). The `/host/earnings` screen
needs truthful ledger rows, which the schema has carried since Phase 2.

**Fee model** (single source of truth stays `SERVICE_FEE_RATE`, §3):
```
gross_cents = booking.total_cents              (what the guest paid)
fee_cents   = total − seats × price_cents      (the 10% service fee — platform keeps it)
net_cents   = seats × price_cents              (the seat subtotal — owed to the host)
```

**Lifecycle:**
- **Created** inside the §6b confirm transaction (same commit as the booking confirmation):
  one `payouts` row per confirmed booking, status `pending`, linked `booking_id`.
- **Refund interaction:** when a confirmed booking is refunded (`refundBooking`, host-cancel flow in
  [events.md](./events.md) §3), its `pending` payout flips to `failed` in the same transaction
  ("failed" = will not be paid). A refund after a payout was `paid` is a clawback problem —
  **deferred** (no payout reaches `paid` in Phase 7 outside seeds, so the case is unreachable).
- **`paid`** is set by real money movement — Phase 8/Connect, or seeds for demo data.

**API (host-scoped, same RBAC as events.md §4):**
| Endpoint | Behavior |
|---|---|
| `GET /api/host/earnings` | Summary: lifetime `net` total, pending vs paid totals, platform fees withheld — plus the payout list (event title, date, booking code, gross/fee/net, status). Powers `/host/earnings`. |

**Tests:** payout row created exactly once per confirmation (webhook replay → still one, via the
existing ledger); amounts satisfy `net = gross − fee` and the fee model above; refund flips pending
payout to `failed`; earnings endpoint aggregates correctly; non-host 403.

**Open question (Phase 7):** is Stripe Connect in scope at all for this project, or do payouts stay
ledger-only through final delivery? Recommendation: ledger-only — Connect adds real-world KYC/bank
requirements that a university demo can't exercise.

---

*Out of scope here:* hold/allocation mechanics ([booking-and-concurrency.md](./booking-and-concurrency.md)),
Stripe Connect money movement (see §11 — deferred), notification content/templates (notifications
module), admin refund UI (Phase 8).
