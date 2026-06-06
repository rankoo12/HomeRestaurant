# Events Read API

> Public, unauthenticated. Only `published` events are exposed. Builds on `PostgresEventRepository`
> (Phase 2), extended with sorting + a public-listing convenience.

## `GET /api/events`
List published events with optional filters + sort.

### Query params (zod-validated; invalid → 400 VALIDATION_ERROR)
| Param | Type | Meaning |
|---|---|---|
| `cuisine` | string | exact cuisine match |
| `maxPrice` | number (dollars) | price ceiling; converted to cents server-side |
| `tags` | string (comma-separated) | event must carry ALL listed tags |
| `sort` | `soonest` \| `price` \| `top-rated` | default `soonest` |
| `limit` | number (1–60, default 24) | page size |
| `offset` | number (≥0, default 0) | page offset |

- `status` is **forced to `published`** for this public endpoint — never client-settable.
- `top-rated` sorts by the chef's derived rating (join `chef_stats`); `price` ascending; `soonest` by
  `starts_at`.

### Response
```jsonc
{
  "events": [ EventListItem, ... ],
  "total": 142,          // total matching (for "142 dinners this week")
  "limit": 24,
  "offset": 0
}
```

`EventListItem` (the list DTO — maps to the frontend `EventCardModel`):
```jsonc
{
  "id": "uuid", "slug": "jollof-sunday",
  "title": "...", "cuisine": "West African", "neighborhood": "Bed-Stuy, Brooklyn",
  "startsAt": "2026-06-07T22:30:00Z", "priceCents": 6800,
  "seatsTotal": 10, "seatsLeft": 3, "imageSeed": 16,
  "chef": { "slug": "amara", "name": "Amara Okafor", "avatarSeed": 1,
            "rating": 4.97, "isSuperhost": true }
}
```
- `seatsLeft` = `seats_total - seats_booked` (active holds aren't subtracted on the public read; that
  precision matters only at booking time in Phase 6).
- Money returned as cents; the frontend formats dollars.

## `GET /api/events/:slug`
Full detail for one published event (404 `NOT_FOUND` if missing/not published).

`EventDetail` extends the list item with:
```jsonc
{
  "shortDescription": "...", "durationMinutes": 180,
  "courses": [ { "position": 1, "name": "To start", "description": "..." }, ... ],
  "tags": ["Communal table", "Halal options", ...],
  "chef": { ...listItem.chef, "tagline": "...", "bio": "...", "reviewCount": 214,
            "badges": ["ID verified", ...] },
  "reviews": [ ReviewItem, ... ]   // recent reviews for this event
}
```

## Repository support (Phase 2 + extensions)
- `EventRepository.list(filters)` exists; **add `sort` + `limit`/`offset` + a `count`** for `total`, and
  join chef name/avatar/rating so the list DTO needs no N+1 lookups.
- `EventRepository.findBySlug` exists (returns courses + tags); the route layer assembles the chef block
  (via `ChefRepository.findBySlugWithStats` + badges) and reviews (via `ReviewRepository.listByEvent`).
- Public reads filter `status = 'published'`.
