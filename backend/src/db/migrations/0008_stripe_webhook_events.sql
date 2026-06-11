-- Stripe webhook event ledger — strict idempotency for webhook delivery.
-- The handler INSERTs the event id inside the same transaction as its effects;
-- a duplicate delivery hits the PK conflict and is acknowledged without
-- reprocessing. See docs/specs/payments.md §5.

CREATE TABLE stripe_webhook_events (
  id           TEXT PRIMARY KEY,          -- Stripe event id ("evt_…")
  type         TEXT NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
