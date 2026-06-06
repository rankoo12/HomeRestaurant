# Frontend Pages

> How the discovery pages compose Phase-4 components and fetch data. All public read pages are **React
> Server Components** fetching `BACKEND_API_URL` directly (see index for rationale).

## Data flow
- A small server-side API client (`lib/api.ts`) wraps `fetch(BACKEND_API_URL + path)` with JSON parsing
  and error handling. Public reads use `cache: 'no-store'` for fresh seat counts (revisit caching later).
- **Mappers** (`lib/mappers.ts`) convert API DTOs → component view-models (`EventCardModel`, `ReviewModel`).
  Components never see raw API shapes; this is the seam that keeps the design system decoupled.
- Money: API returns cents → mappers divide to dollars for `Price`/cards.
- Dates: API returns ISO `startsAt` → mappers format `dateLabel` ("Sun, Jun 7") + `timeLabel` ("6:30 PM").

## `/` — Landing (Editorial)
Server component. Fetches a small set of featured events + chefs.
- **Hero** (organism) with the warm food backdrop + CTA → `/events`.
- **Featured tonight**: a 3-up grid of `EventCard` (soonest published).
- **EventFeature** highlight row for one standout event.
- **How it works**: the trust section (verification / secure pay / communal) — static copy.
- **Chef strip**: `Avatar` + name cards linking to `/chefs/[slug]`.
- Uses `Nav` (logged-out variant) + `Footer`.

## `/events` — Discovery
Server component shell + a client island for interactive filters/sort.
- Compact hero + `SearchBar` (presentational) + `CategoryRow`.
- `FilterRail` (cuisine, dietary, price) + sort chips — controlled client state that updates the query
  string; the list re-fetches on change (server component re-render via `searchParams`, or a client
  fetch to the API). **Approach:** drive filters through URL `searchParams` so the page stays a server
  component and links are shareable; a thin client component manages the controls and pushes to the router.
- Grid of `EventCard`; header shows `total` ("142 dinners this week").
- **Empty state** when no results: illustration + "Clear filters" CTA (see [04-states.md](./04-states.md)).

## `/events/[slug]` — Event detail
Server component.
- Gallery (FoodImage tiles), title/meta row, host strip (→ chef), `MetaStat` grid (date/duration/size/
  neighborhood), about + menu (`courses`), tags (`Chip`), reviews (`ReviewCard`).
- **BookingCard** (organism) rendered **display-only** — the "Reserve" button is present but inert this
  phase (wired in Phase 6). A small note or disabled affordance signals it's not yet active.
- 404 → Next `not-found()` when the API returns NOT_FOUND.

## `/chefs/[slug]` — Chef profile
Server component.
- Cover (FoodImage) + avatar + name + `VerifiedPill` + location/cuisine.
- Left rail: stats card (rating, reviews, dinners, since) + "Verified by Home Restaurant" badge list.
- Right: bio, **Upcoming dinners** (`EventCard` grid), reviews (`ReviewCard`).
- 404 when unknown slug.

## Shell
The `(app)` group currently has no chrome. This phase adds `Nav` + `Footer` to the public/discovery pages
(landing is in `(public)`; events/chefs are in `(app)` but public). Keep the auth guards from Phase 3
untouched — discovery routes remain public.
