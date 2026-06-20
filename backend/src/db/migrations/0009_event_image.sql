-- 0009 — optional uploaded event photo, stored inline as a base64 data URL.
-- When NULL, the UI falls back to the generated gradient (image_seed).
ALTER TABLE events ADD COLUMN image_data TEXT;
