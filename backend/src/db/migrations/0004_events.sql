-- 0004 — events, courses, tags. See docs/specs/data/04-events-tables.md.

CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  chef_id           UUID NOT NULL REFERENCES chef_profiles (user_id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  cuisine           TEXT NOT NULL,
  short_description TEXT NOT NULL,
  neighborhood      TEXT NOT NULL,
  status            event_status NOT NULL DEFAULT 'draft',
  starts_at         TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  seats_total       INTEGER NOT NULL CHECK (seats_total > 0),
  -- The no-overbooking floor: confirmed seats can never exceed capacity.
  seats_booked      INTEGER NOT NULL DEFAULT 0
                      CHECK (seats_booked >= 0 AND seats_booked <= seats_total),
  image_seed        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_chef     ON events (chef_id);
CREATE INDEX idx_events_status   ON events (status);
CREATE INDEX idx_events_starts   ON events (starts_at);

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ordered menu courses.
CREATE TABLE event_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  UNIQUE (event_id, position)
);

-- Dietary / format tags (drive discovery filters in Phase 5).
CREATE TABLE event_tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  UNIQUE (event_id, label)
);

CREATE INDEX idx_event_tags_label ON event_tags (label);
