# Identity Tables

> Behavior (auth flows, hashing, JWT) is **Phase 3**. Phase 2 defines the table only.

## `users`
Everyone on the platform — guest, host, admin — is one row here.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | `gen_random_uuid()`. |
| `email` | `CITEXT UNIQUE NOT NULL` | Case-insensitive uniqueness. |
| `password_hash` | `TEXT` | Nullable (OAuth-only users may have none). Argon2/bcrypt set in Phase 3. |
| `role` | `user_role NOT NULL DEFAULT 'guest'` | Enum. RBAC source of truth. |
| `full_name` | `TEXT NOT NULL` | Display name. |
| `phone` | `TEXT` | Optional; used at checkout. |
| `dietary_prefs` | `TEXT[] NOT NULL DEFAULT '{}'` | From signup ("dietary preferences"). |
| `avatar_seed` | `INTEGER NOT NULL DEFAULT 0` | Drives the generated avatar (matches prototype `Avatar seed`). |
| `is_suspended` | `BOOLEAN NOT NULL DEFAULT false` | Admin can suspend (Phase 8). |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Trigger-maintained. |

**Indexes:** unique on `email` (implicit via CITEXT unique), index on `role` (admin listings).

**Sessions:** not a table — refresh/session state lives in **Redis** (Phase 3). Recorded here so nobody
adds a `sessions` table by reflex.

**Relationships:** `chef_profiles.user_id → users.id` (1:1, host only); `bookings.guest_id → users.id`;
`reviews.author_id → users.id`.
