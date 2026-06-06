# Phase 5 — Discovery & Profiles

**Branch:** `phase-5-discovery` · **Depends on:** Phases 2, 4 · **Status:** ✅ Complete

## Objective
The public, read-only discovery experience on real data: landing page, `/events` discovery with filters,
event details, and chef profiles — composed from the Phase 4 component library.

## In scope
- Landing (`/`) with both home variants (Editorial / Discovery) and featured events/chefs.
- `/events`: discovery grid + `FilterRail` (cuisine, price, dietary, date) + sort + empty state.
- `/events/:eventId`: gallery, menu, meta, reviews, and the booking widget (display only — no purchase).
- `/chefs/:chefId`: bio, verification badges, upcoming events, aggregated reviews.
- Backend read APIs: list/filter events, event detail, chef profile + review aggregation.

## Out of scope
- Booking/payment (Phase 6). Review submission (Phase 7). Auth-gated personalization.

## Requires specs
- [`docs/specs/discovery/`](../discovery/00-index.md) *(✅ authored)* — the **discovery spec tree**: events
  read API (list/filter/sort + detail), chef-profile read API (profile + stats + events + reviews), the
  frontend pages + data flow, and loading/empty/not-found states. Read `discovery/00-index.md` first.

## Acceptance checklist
- [x] Landing renders real featured events/chefs. *(Editorial layout, fed by `GET /api/events`; verified end-to-end.)*
- [x] `/events` filters and sorts on real data; "no results" shows the empty state. *(URL-driven cuisine/tags/price/sort; empty state verified.)*
- [x] Event detail shows menu, meta, reviews, and a non-functional booking widget. *(BookingCard display-only with a "Booking opens soon" note.)*
- [x] Chef profile aggregates rating and lists upcoming events. *(stats from `chef_stats`, upcoming events + reviews with author names.)*

## What shipped
- **Spec tree:** [`docs/specs/discovery/`](../discovery/00-index.md) (5 files).
- **Backend reads:** `GET /api/events` (filter cuisine/tags/maxPrice, sort soonest/price/top-rated,
  pagination + total), `GET /api/events/:slug` (detail + chef block + reviews), `GET /api/chefs/:slug`
  (profile + stats + upcoming + reviews). Public, `published`-only.
- **Repos extended:** `EventRepository.listForDiscovery` (chef-joined, sorted, counted — no N+1);
  `ReviewRepository.listBy{Chef,Event}WithAuthor`; `ChefRepository.findPublicBy{Slug,UserId}`.
- **Frontend:** `lib/api.ts` (server-side client + DTOs), `lib/mappers.ts` (DTO→view-model, money/date
  formatting), and the four pages — landing, `/events` (server + `filters-client` URL-driven controls),
  `/events/[slug]`, `/chefs/[slug]` — all Server Components fetching the backend directly.
- **Tests:** 7 discovery integration tests (27 backend total).

## Notes
- **Data fetching:** public pages are RSCs hitting `BACKEND_API_URL` server-side (no proxy hop) — faster,
  SEO-friendly; `/api/proxy` stays for authed/browser calls. Front/back separation holds (pages call REST).
- **Booking widget is display-only** this phase; Phase 6 wires the real flow.
- **Known minor:** discovery cards (`EventCard`/`EventFeature`, which are `<button>`s) are wrapped in
  `<Link>` for navigation — valid-enough but a nested interactive element; revisit if hydration warns.
  Loading skeletons (`loading.tsx`) noted in the spec are deferred — pages render fast on local data.
