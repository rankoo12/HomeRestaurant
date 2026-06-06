# Reviews Table + Derived Chef Stats

> Review *submission behavior* is Phase 7; *moderation* is Phase 8. Phase 2 defines the `reviews` table
> and the **derived** `chef_stats` view that powers ratings on chef profiles.

## `reviews`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `event_id` | `UUID NOT NULL` → `events.id` ON DELETE CASCADE | What was reviewed. |
| `chef_id` | `UUID NOT NULL` → `chef_profiles.user_id` ON DELETE CASCADE | Denormalized for fast profile aggregation. |
| `author_id` | `UUID NOT NULL` → `users.id` ON DELETE RESTRICT | The guest. |
| `rating` | `INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)` | Stars. |
| `body` | `TEXT NOT NULL` | Review text. |
| `is_flagged` | `BOOLEAN NOT NULL DEFAULT false` | Moderation (Phase 8). |
| `created_at` / `updated_at` | `timestamptz` | |

**Guard:** one review per guest per event.
```sql
CREATE UNIQUE INDEX uniq_review_per_guest_event ON reviews (event_id, author_id);
```
**Indexes:** `chef_id` (profile aggregation), `event_id`.

> `chef_id` is denormalized deliberately: it lets `chef_stats` aggregate without joining through `events`,
> and it survives even though it's derivable. Integrity is kept by setting it from the event at insert time
> (enforced in the Phase 7 service, not the DB).

## `chef_stats`  — a VIEW, not a table
Rating, review count, and dinners hosted are **always derived** so they can never drift from reality
(the trust-and-safety reason we chose derivation over stored aggregates).

```sql
CREATE VIEW chef_stats AS
SELECT
  cp.user_id                                   AS chef_id,
  COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS rating,
  COUNT(r.id)                                  AS review_count,
  (SELECT COUNT(*) FROM events e
     WHERE e.chef_id = cp.user_id
       AND e.status = 'completed')             AS dinners_hosted
FROM chef_profiles cp
LEFT JOIN reviews r ON r.chef_id = cp.user_id
GROUP BY cp.user_id;
```

- Read it joined to `chef_profiles` whenever a profile/card needs rating + counts.
- If reads ever get hot, we can swap the view for a materialized view or a denormalized cache **without
  changing callers** — they already query `chef_stats`. That swap is out of Phase-2 scope.
