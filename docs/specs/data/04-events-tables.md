# Events Tables

> Event *lifecycle behavior* (create/publish/cancel) is Phases 5/7. Phase 2 defines the shape, including
> the capacity field that booking depends on.

## `events`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `slug` | `TEXT UNIQUE NOT NULL` | URL handle (`jollof-sunday`). |
| `chef_id` | `UUID NOT NULL` → `chef_profiles.user_id` ON DELETE CASCADE | Host. |
| `title` | `TEXT NOT NULL` | |
| `cuisine` | `TEXT NOT NULL` | |
| `short_description` | `TEXT NOT NULL` | Card/teaser copy. |
| `neighborhood` | `TEXT NOT NULL` | "Bed-Stuy, Brooklyn". |
| `status` | `event_status NOT NULL DEFAULT 'draft'` | draft/published/unpublished/cancelled/completed. |
| `starts_at` | `timestamptz NOT NULL` | Replaces the prototype's display `date`+`time`. |
| `duration_minutes` | `INTEGER NOT NULL CHECK (duration_minutes > 0)` | From "3 hrs" etc. |
| `price_cents` | `INTEGER NOT NULL CHECK (price_cents >= 0)` | Per seat, minor units. |
| `seats_total` | `INTEGER NOT NULL CHECK (seats_total > 0)` | Capacity. |
| `seats_booked` | `INTEGER NOT NULL DEFAULT 0 CHECK (seats_booked >= 0 AND seats_booked <= seats_total)` | Confirmed seats. **The no-overbooking invariant lives here** (see [08](./08-constraints-and-concurrency.md)). |
| `image_seed` | `INTEGER NOT NULL DEFAULT 0` | Generated hero image. |
| `created_at` / `updated_at` | `timestamptz` | |

> **Seat accounting:** `seats_total - seats_booked - (active seat_holds)` = bookable now. `seats_booked`
> is only ever mutated inside the booking transaction (Phase 6). Phase 2 just guarantees the CHECK
> constraints make an out-of-range value impossible.

**Indexes:** `chef_id`; `status`; `starts_at` (discovery sorting); unique `slug`.

## `event_courses`  (the menu)
Ordered courses, mirroring prototype `courses: [{n, d}]`.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `event_id` | `UUID NOT NULL` → `events.id` ON DELETE CASCADE | |
| `position` | `INTEGER NOT NULL` | Order on the menu. |
| `name` | `TEXT NOT NULL` | "To start", "The table". |
| `description` | `TEXT NOT NULL` | Dish copy. |
| `UNIQUE(event_id, position)` | | Stable ordering. |

## `event_tags`  (dietary / format chips)
Mirrors prototype `tags: ["Communal table", "Halal options", ...]`. Drives discovery filters (Phase 5).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `event_id` | `UUID NOT NULL` → `events.id` ON DELETE CASCADE | |
| `label` | `TEXT NOT NULL` | |
| `UNIQUE(event_id, label)` | | |

**Index:** `label` (filter by tag across events).
