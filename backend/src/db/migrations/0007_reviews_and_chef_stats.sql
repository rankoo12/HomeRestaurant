-- 0007 — reviews + the derived chef_stats view. See docs/specs/data/07-reviews-tables.md.

CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  chef_id    UUID NOT NULL REFERENCES chef_profiles (user_id) ON DELETE CASCADE,  -- denormalized for fast aggregation
  author_id  UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One review per guest per event.
CREATE UNIQUE INDEX uniq_review_per_guest_event ON reviews (event_id, author_id);
CREATE INDEX idx_reviews_chef  ON reviews (chef_id);
CREATE INDEX idx_reviews_event ON reviews (event_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Derived chef aggregates — always live, never drift (trust-and-safety choice).
CREATE VIEW chef_stats AS
SELECT
  cp.user_id                                     AS chef_id,
  COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)  AS rating,
  COUNT(r.id)                                    AS review_count,
  (SELECT COUNT(*) FROM events e
     WHERE e.chef_id = cp.user_id
       AND e.status = 'completed')               AS dinners_hosted
FROM chef_profiles cp
LEFT JOIN reviews r ON r.chef_id = cp.user_id
GROUP BY cp.user_id;
