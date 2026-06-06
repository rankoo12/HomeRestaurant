# Chef (Host) Tables

> Host-only data, separated from `users` so guest/admin rows aren't littered with null host columns.
> Onboarding & verification *behavior* is Phase 7; the **admin approve/reject** action is Phase 8.
> Phase 2 defines the tables + the verification state column.

## `chef_profiles`  (1:1 with a host user)

| Column | Type | Notes |
|---|---|---|
| `user_id` | `UUID PK` → `users.id` ON DELETE CASCADE | PK **is** the FK → enforces 1:1. |
| `slug` | `TEXT UNIQUE NOT NULL` | URL handle (`amara`). |
| `cuisine` | `TEXT NOT NULL` | e.g. "West African". |
| `city` | `TEXT NOT NULL` | "Brooklyn, NY". |
| `tagline` | `TEXT NOT NULL` | One-liner. |
| `bio` | `TEXT NOT NULL` | Long description. |
| `cover_seed` | `INTEGER NOT NULL DEFAULT 0` | Generated cover image seed. |
| `is_superhost` | `BOOLEAN NOT NULL DEFAULT false` | Badge. |
| `verification_status` | `verification_status NOT NULL DEFAULT 'pending'` | pending→approved/rejected. A chef may publish events only when `approved` (enforced in Phase 7/8 logic). |
| `hosting_since` | `INTEGER` | Year (prototype `since`). |
| `created_at` / `updated_at` | `timestamptz` | |

> **Derived, not stored:** `rating`, `review_count`, `dinners_hosted` come from the `chef_stats` view
> (see [07-reviews-tables.md](./07-reviews-tables.md)). Do **not** add them as columns.

## `chef_verifications`  (audit trail of KYC submissions)
One row per submitted verification document/check. The chef's *current* status is the column above; this
table is the history behind it.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `chef_id` | `UUID NOT NULL` → `chef_profiles.user_id` ON DELETE CASCADE | |
| `kind` | `TEXT NOT NULL` | "id_document", "food_safety_cert", "kitchen_inspection". |
| `status` | `verification_status NOT NULL DEFAULT 'pending'` | Per-item status. |
| `document_ref` | `TEXT` | Opaque storage reference (no raw PII in DB). |
| `reviewed_by` | `UUID` → `users.id` | Admin who actioned it (Phase 8). |
| `reviewed_at` | `timestamptz` | |
| `notes` | `TEXT` | Admin reject reason, etc. |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

## `chef_badges`  (the "Verified by Home Restaurant" list)
Mirrors the prototype `badges: ["ID verified", "Food-safety certified", "Kitchen inspected"]`.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `chef_id` | `UUID NOT NULL` → `chef_profiles.user_id` ON DELETE CASCADE | |
| `label` | `TEXT NOT NULL` | Badge text. |
| `UNIQUE(chef_id, label)` | | No duplicate badges. |
