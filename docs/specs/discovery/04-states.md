# Loading, Empty & Not-Found States

> The non-happy-path states for the discovery surface. Final cross-app edge states (404/403/overbooking/
> payment-failed) are consolidated in Phase 8; this spec covers what discovery needs now.

## Empty (no search results)
- `/events` with filters that match nothing: render an empty-state block — a friendly line ("No dinners
  match those filters") + a **Clear filters** button that resets the query string. Never a blank grid.
- A chef with no upcoming events: "No upcoming dinners right now" in the Upcoming section.

## Loading
- Server components render when data is ready, so there's no client spinner for the initial load. Add a
  route-level `loading.tsx` (skeleton) for `/events`, `/events/[slug]`, `/chefs/[slug]` so navigation
  shows a skeleton while the server fetch resolves.
- Skeletons reuse layout structure (card-shaped placeholders) using token surfaces — no new colors.

## Not found
- `/events/[slug]` and `/chefs/[slug]`: when the API returns `NOT_FOUND`, call Next `notFound()` →
  renders the app's `not-found.tsx` (the existing 404). Phase 8 gives 404 its final styling.

## Errors
- If a backend read fails (non-404), the page surfaces a minimal, friendly error block rather than a stack
  trace. Logged server-side. (Full error UX is Phase 8.)
