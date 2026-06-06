-- 0005 — bookings + seat_holds (concurrency-critical).
-- See docs/specs/data/05-booking-tables.md and 08-constraints-and-concurrency.md.

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
  guest_id          UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  seats             INTEGER NOT NULL CHECK (seats > 0),
  status            booking_status NOT NULL DEFAULT 'pending',
  confirmation_code TEXT UNIQUE NOT NULL,
  total_cents       INTEGER NOT NULL CHECK (total_cents >= 0),  -- server-computed, never client-supplied
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_event ON bookings (event_id);
CREATE INDEX idx_bookings_guest ON bookings (guest_id);

-- A guest can't hold two *active* bookings for the same event.
CREATE UNIQUE INDEX uniq_active_booking_per_guest_event
  ON bookings (event_id, guest_id)
  WHERE status IN ('pending', 'confirmed');

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Transient seat reservations held during checkout (the concurrency primitive).
CREATE TABLE seat_holds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  guest_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seats      INTEGER NOT NULL CHECK (seats > 0),
  status     seat_hold_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  booking_id UUID REFERENCES bookings (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seat_holds_event_status ON seat_holds (event_id, status);
CREATE INDEX idx_seat_holds_expires      ON seat_holds (expires_at);

-- At most one *active* hold per guest per event.
CREATE UNIQUE INDEX uniq_active_hold_per_guest_event
  ON seat_holds (event_id, guest_id)
  WHERE status = 'active';
