# Cross-cutting Spec — Error & Empty States

> Referenced by Phase 8 (and touched incrementally by Phases 5–7). Defines the contract for every
> non-happy-path state in the page spec so they're handled deliberately, never as blank screens.
> **Expanded at Phase 8 spec time** with a shipped/remaining audit — Phase 8 finishes the gaps.

## States to cover (the contract)

| State | Trigger | Handling contract | Status |
|---|---|---|---|
| **404 Not Found** | Invalid URL or deleted resource. | Friendly page with quick links back to `/events` and `/`. | ✅ Shipped (P8): branded `not-found.tsx` — serif headline + quick links. |
| **403 Forbidden** | Guest accesses `/host` or `/admin`. | Server-decided 403; page prompts login with correct credentials. | ✅ Shipped (P3, restyled P4). P8 verified: copy is area-agnostic ("this area is restricted") — covers admin. |
| **Overbooking** | Seat taken during checkout (concurrency conflict). | Abort the transaction, inform clearly, suggest alternative dates for the same chef. | ✅ Shipped (P6): 409 `INSUFFICIENT_SEATS` + alternatives in the booking widget; lost-seat refund state on checkout. |
| **Payment Failed** | Stripe rejection / session expiry. | Stay on checkout, surface the error, **preserve all inputs**, prompt for another card. | ✅ Shipped (P6): failure banner + retry while the hold lives; hold-expired re-reserve state. |
| **Empty States** | No search results, no bookings, no events yet. | Illustration/CTA — never a blank page. | ✅ Shipped across P5–P8 (discovery, reviews, roster, earnings, dashboards, admin queues). |

## Phase 8 remaining work — ✅ ALL SHIPPED

1. **Branded 404** — ✅ `not-found.tsx`: serif headline, quick links to `/events` + `/`.
2. **Error boundaries** — ✅ root `error.tsx` (friendly retry) + `global-error.tsx`
   (self-contained `<html>`-rendering last resort).
3. **Loading states** — ✅ `loading.tsx` skeletons via the new `Skeleton` atom:
   `/events` grid, `/events/[eventId]` detail, host portal (`(portal)/loading.tsx`),
   admin portal (`admin/loading.tsx`). Card-shaped — no spinner-only screens.
4. **Admin queue empty states** — ✅ "Nothing waiting — nice." on verifications,
   moderation, and the payout ledger; user directory gets "No matching users".
5. **429** — ✅ API returns the standard envelope (`RATE_LIMITED`); login + signup
   surface "Too many attempts — wait a minute and try again." inline on status 429.

## Notes
- These states reuse design-system organisms (Phase 4); no bespoke styling and **no new tokens**.
- 403 and overbooking originate in backend contracts (Phases 3 and 6); this spec is the single place
  their UI presentation is defined, so behavior stays consistent across the app.
- Test plan: each remaining item gets a render assertion (404 route, thrown-error boundary, skeleton
  presence) — kept light; the heavy contracts (403/overbooking/payment-failed) are already covered
  by the P3/P6 suites. *(Shipped P8: `frontend/src/app/__tests__/edge-states.test.tsx` via vitest —
  `npm test` in the frontend workspace; covers 404 links, error-boundary reset, skeleton, admin
  empty state.)*
