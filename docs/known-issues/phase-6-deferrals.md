# Phase 6 — accepted deferrals

> Documented gaps, accepted at phase close. Don't re-investigate; each has a Phase 7 home.

## 1. Confirmation email — delivery deferred to Phase 7

**What ships in Phase 6:** the `NotificationService` seam
(`backend/src/modules/notifications/interfaces.ts`) wired into the webhook confirmation path,
with a `LogNotificationService` that emits the full confirmation payload as a structured log line
(fire-and-forget; can never fail the webhook).

**What's deferred:** actual email delivery. The project has no SMTP/provider credentials, no BullMQ
worker process, and no template infrastructure — that is real Phase 7 work (the payouts +
messaging phase needs the same worker infra). The Phase 7 email worker consumes the exact payload
the log implementation already emits, so the swap is one constructor argument in
`backend/src/api/routes/bookings.ts`.

## 2. Hold sweeper runs in-process, not in BullMQ

`SeatHoldRepository.sweepExpired()` runs every 5 minutes via a `setInterval` in
`backend/src/api/server.ts`. This is **hygiene only**: availability queries discount stale holds
via `expires_at > now()`, and the booking view lazily flips them — correctness is proven by test
with no sweeper at all (`booking-service.integration.test.ts`, "expired hold frees seats").

Deliberately **not** BullMQ yet: the project has no worker infrastructure, and standing it up for
one idempotent UPDATE would be over-engineering. Migrate the interval to a BullMQ repeatable job
when Phase 7 introduces real workers (payouts, email). Note: if the API ever runs multi-instance,
the sweep is concurrency-safe anyway (status-guarded UPDATE).

## 3. Stripe verification is manual, not in CI

CI runs entirely on `FakePaymentGateway` — no Stripe keys, no network. Real test-mode verification
is a manual pre-merge checklist documented in `backend/README.md` ("Payments — Stripe test-mode
verification"). This is by design (docs/specs/payments.md §9): CI must never depend on Stripe
availability.

## 4. No Redis seat-count cache

Phase 6's "cache/DB consistency" scope item is satisfied vacuously: no seat cache was built, so
discovery reads the DB directly and can't diverge. Add a cache only if discovery load ever demands
it — and then strictly as a UI hint per docs/specs/booking-and-concurrency.md §4 ("never read for
an allocation decision").
