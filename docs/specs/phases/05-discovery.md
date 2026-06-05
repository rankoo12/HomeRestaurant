# Phase 5 — Discovery & Profiles

**Branch:** `phase-5-discovery` · **Depends on:** Phases 2, 4 · **Status:** 📝 Not started

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
- `docs/specs/events.md` *(to author this phase — read side)* — event read model, listing/filter/search query contract, pagination.
- `docs/specs/reviews-and-moderation.md` *(to author this phase — read side only)* — review read model + rating aggregation for profiles.

## Acceptance checklist
- [ ] Landing renders real featured events/chefs (both variants).
- [ ] `/events` filters and sorts on real data; "no results" shows the empty state.
- [ ] Event detail shows menu, meta, reviews, and a non-functional booking widget.
- [ ] Chef profile aggregates rating and lists upcoming events.
