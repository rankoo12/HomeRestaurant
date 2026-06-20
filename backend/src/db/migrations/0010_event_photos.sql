-- 0010 — event photo gallery. Replaces the single events.image_data with an
-- ordered list of photos (position 0 is the cover). Each photo is a base64
-- data URL stored inline (same approach as KYC images), demo-scale.
CREATE TABLE event_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  image_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, position)
);

CREATE INDEX idx_event_photos_event ON event_photos (event_id, position);

-- Carry forward any single uploaded image into the new gallery as the cover.
INSERT INTO event_photos (event_id, position, image_data)
SELECT id, 0, image_data FROM events WHERE image_data IS NOT NULL;

-- events.image_data is now superseded by event_photos; leave the column in
-- place (nullable, unused) to avoid a destructive drop in a demo DB.
