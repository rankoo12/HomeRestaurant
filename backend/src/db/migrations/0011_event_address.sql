-- 0011 — exact event location. neighborhood (existing) stays the PUBLIC label;
-- address_line + lat/long are the precise location, revealed only to a guest
-- who has booked (and the host/admin). See the booking view in the API.
ALTER TABLE events ADD COLUMN address_line TEXT;
ALTER TABLE events ADD COLUMN latitude  DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN longitude DOUBLE PRECISION;
