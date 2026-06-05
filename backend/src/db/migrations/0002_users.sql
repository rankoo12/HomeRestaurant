-- 0002 — users (everyone: guest, host, admin). See docs/specs/data/02-identity-tables.md.

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT,                                   -- nullable: OAuth-only users
  role          user_role NOT NULL DEFAULT 'guest',
  full_name     TEXT NOT NULL,
  phone         TEXT,
  dietary_prefs TEXT[] NOT NULL DEFAULT '{}',
  avatar_seed   INTEGER NOT NULL DEFAULT 0,
  is_suspended  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users (role);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
