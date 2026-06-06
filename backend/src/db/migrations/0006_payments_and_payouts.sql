-- 0006 — payments + payouts. See docs/specs/data/06-payments-tables.md.

CREATE TABLE payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE RESTRICT,  -- 1:1
  status                   payment_status NOT NULL DEFAULT 'pending',
  amount_cents             INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency                 TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT UNIQUE,
  failure_reason           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chef_profiles (user_id) ON DELETE RESTRICT,
  booking_id  UUID REFERENCES bookings (id) ON DELETE SET NULL,
  gross_cents INTEGER NOT NULL CHECK (gross_cents >= 0),
  fee_cents   INTEGER NOT NULL CHECK (fee_cents >= 0),
  net_cents   INTEGER NOT NULL CHECK (net_cents >= 0),
  status      payout_status NOT NULL DEFAULT 'pending',
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_chef   ON payouts (chef_id);
CREATE INDEX idx_payouts_status ON payouts (status);

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
