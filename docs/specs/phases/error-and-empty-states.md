# Cross-cutting Spec — Error & Empty States

> Referenced by Phase 8 (and touched incrementally by Phases 5–7). Defines the contract for every
> non-happy-path state in the page spec so they're handled deliberately, never as blank screens.

## States to cover

| State | Trigger | Handling contract |
|---|---|---|
| **404 Not Found** | Invalid URL or deleted resource. | Friendly page with quick links back to `/events` and `/`. |
| **403 Forbidden** | Guest accesses `/host` or `/admin`. | Server-decided 403; page prompts login with correct credentials. (Defined with identity in Phase 3, finalized here.) |
| **Overbooking** | Seat taken during checkout (concurrency conflict). | Abort the transaction, inform clearly, suggest alternative dates for the same chef. (Implemented in Phase 6.) |
| **Payment Failed** | Stripe rejection. | Stay on checkout, surface the error, **preserve all inputs**, prompt for another card. (Implemented in Phase 6.) |
| **Empty States** | No search results, no bookings, no events yet. | Illustration + CTA (e.g. "Clear filters", "Browse upcoming dinners") — never a blank page. |

## Notes
- These states reuse design-system organisms (Phase 4); no bespoke styling.
- 403 and overbooking originate in backend contracts (Phases 3 and 6); this spec is the single place their
  UI presentation is defined, so behavior stays consistent across the app.
