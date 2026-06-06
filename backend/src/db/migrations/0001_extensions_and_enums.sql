-- 0001 — extensions, enums, and the shared updated_at trigger function.
-- See docs/specs/data/01-erd-overview.md and 08-constraints-and-concurrency.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

-- Closed status sets — invalid states are unrepresentable.
CREATE TYPE user_role           AS ENUM ('guest', 'host', 'admin');
CREATE TYPE event_status        AS ENUM ('draft', 'published', 'unpublished', 'cancelled', 'completed');
CREATE TYPE booking_status      AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE seat_hold_status    AS ENUM ('active', 'consumed', 'released', 'expired');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_status      AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE payout_status       AS ENUM ('pending', 'paid', 'failed');

-- Shared trigger to maintain updated_at on mutable tables.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
