# Discovery & Profiles — Spec Tree

> The read-side specs for **Phase 5**: the public discovery experience on real data — landing, `/events`,
> event detail, chef profiles — composed from the Phase 4 component library and fed by new backend read
> APIs. Read this index first, then the per-area files.

## Map

| Spec | Covers |
|---|---|
| [01-events-read-api.md](./01-events-read-api.md) | List/filter/sort events + event detail by slug. Query contract, DTOs, pagination. |
| [02-chef-read-api.md](./02-chef-read-api.md) | Chef profile by slug: profile + derived stats + upcoming events + reviews. |
| [03-frontend-pages.md](./03-frontend-pages.md) | Landing, `/events`, `/events/[slug]`, `/chefs/[slug]` — composition + data flow. |
| [04-states.md](./04-states.md) | Loading, empty, and not-found states for the discovery surface. |

## Locked decisions
- **Landing = Editorial** layout (hero + featured + trust section + chef strip). The Discovery grid lives
  at `/events`; the homepage doesn't duplicate it.
- **Public read pages are React Server Components** that fetch the backend REST API directly server-side
  (`BACKEND_API_URL`). No auth needed for public discovery, so this avoids the proxy hop, gives real SEO,
  and ships no client JS for data. The `/api/proxy` remains for browser-initiated authed calls/mutations.
  Front/back separation holds: pages call the REST API, never the DB.
- **Public endpoints, no auth:** `GET /api/events`, `GET /api/events/:slug`, `GET /api/chefs/:slug`.
  Only `published` events are exposed to the public listing/detail.
- **Read-only:** the booking widget renders but doesn't purchase (Phase 6); reviews display but can't be
  submitted (Phase 7).
- **URLs use slugs** (`/events/jollof-sunday`, `/chefs/amara`) — the human-readable slug columns from the
  Phase 2 schema.

## Scope (from the phase spec)
- Backend: events read API (list+filter+sort, detail), chef profile read API (with stats/events/reviews).
- Frontend: landing, discovery grid + filters + sort + empty state, event detail, chef profile.
- Repos extended as needed (chef list, reviews-by-event/chef, event filters/sort) — building on Phase 2.

## Out of scope
- Booking/payment (Phase 6), review submission (Phase 7), auth-gated personalization, map view, search
  ranking beyond simple sort. Map/geo is deferred; "Where" search is a deterministic filter only.

## Cross-references
- Read model builds on [data/04-events-tables.md](../data/04-events-tables.md),
  [data/03-chef-tables.md](../data/03-chef-tables.md), [data/07-reviews-tables.md](../data/07-reviews-tables.md).
- Components from [design-system/03-component-inventory.md](../design-system/03-component-inventory.md).
