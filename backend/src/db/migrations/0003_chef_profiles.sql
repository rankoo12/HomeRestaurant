-- 0003 — chef profiles, verifications, badges. See docs/specs/data/03-chef-tables.md.

CREATE TABLE chef_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,  -- 1:1
  slug                TEXT UNIQUE NOT NULL,
  cuisine             TEXT NOT NULL,
  city                TEXT NOT NULL,
  tagline             TEXT NOT NULL,
  bio                 TEXT NOT NULL,
  cover_seed          INTEGER NOT NULL DEFAULT 0,
  is_superhost        BOOLEAN NOT NULL DEFAULT false,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  hosting_since       INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_chef_profiles_updated_at
  BEFORE UPDATE ON chef_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit trail of KYC submissions (current status lives on chef_profiles).
CREATE TABLE chef_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chef_profiles (user_id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                                  -- id_document | food_safety_cert | kitchen_inspection
  status        verification_status NOT NULL DEFAULT 'pending',
  document_ref  TEXT,                                           -- opaque storage ref; no raw PII
  reviewed_by   UUID REFERENCES users (id),
  reviewed_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_verifications_chef ON chef_verifications (chef_id);

-- "Verified by Home Restaurant" badge list.
CREATE TABLE chef_badges (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chef_profiles (user_id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  UNIQUE (chef_id, label)
);
