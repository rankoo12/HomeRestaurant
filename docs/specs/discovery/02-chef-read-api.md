# Chef Profile Read API

> Public, unauthenticated. Aggregates a chef's profile, derived stats, upcoming events, and reviews.

## `GET /api/chefs/:slug`
404 `NOT_FOUND` if no chef with that slug.

### Response — `ChefProfileDetail`
```jsonc
{
  "slug": "amara", "name": "Amara Okafor",
  "city": "Brooklyn, NY", "cuisine": "West African",
  "tagline": "...", "bio": "...",
  "avatarSeed": 1, "coverSeed": 11,
  "isSuperhost": true, "hostingSince": 2021,
  "verificationStatus": "approved",
  "badges": ["ID verified", "Food-safety certified", "Kitchen inspected"],
  "stats": { "rating": 4.97, "reviewCount": 214, "dinnersHosted": 186 },
  "upcomingEvents": [ EventListItem, ... ],   // this chef's published events, soonest first
  "reviews": [ ReviewItem, ... ]              // recent reviews across the chef's events
}
```

`ReviewItem` (maps to the frontend `ReviewModel`):
```jsonc
{ "id": "uuid", "author": "Mara L.", "avatarSeed": 31,
  "rating": 5, "createdAt": "2026-05-...", "body": "..." }
```

- `name` / `avatarSeed` come from the chef's `users` row; profile fields from `chef_profiles`; `stats`
  from the `chef_stats` view (derived — never drift); `badges` from `chef_badges`.
- `upcomingEvents` = `EventRepository.list({ chefId, status: 'published' })`, mapped to `EventListItem`.
- `reviews` = `ReviewRepository.listByChef(chefId)`, joined to the author's name/avatar.

## Repository support
- `ChefRepository.findBySlugWithStats` exists (profile + stats). Add `listBadges` usage (exists) and a
  join (or follow-up query) for the author display fields on reviews.
- Review→author display: `listByChef` returns `author_id`; the route resolves names/avatars via a small
  batched `users` lookup (no per-review query).

## Notes
- The author display name is whatever the user set (`full_name`); seed avatars only (no uploads this
  phase). Suspended/again-private users are out of scope here.
