# Spec Index — Home Restaurant

> The map of all domain specs. We are **spec-driven (SDD)**: read the relevant spec before
> implementing, and add a spec here *before* building anything non-trivial.

## How to use this index
1. Find the area you're about to touch in the table below.
2. Open and read that spec fully.
3. If no spec exists for it, **stop and write the spec first** (or ask the user), then add a row here.

## Specs

| Spec | Status | Covers |
|---|---|---|
| [Home_Dining_Platform_Pages_Spec.md](./Home_Dining_Platform_Pages_Spec.md) | ✅ Authored | Full page/route architecture across all portals + edge states. |
| [phases/00-master-plan.md](./phases/00-master-plan.md) | ✅ Authored | The 8-phase delivery roadmap, branch-per-phase, dependency graph. |
| [tooling-and-conventions.md](./tooling-and-conventions.md) | ✅ Authored | Runtime, TS/lint config, scripts, git/commit conventions, CI. *(Phase 1)* |
| [data/](./data/00-index.md) | ✅ Authored | **Spec tree** — database schema & domain model, split by domain (ERD, identity, chef, events, booking, payments, reviews, constraints). *(Phase 2)* |
| [identity/](./identity/00-index.md) | ✅ Authored | **Spec tree** — auth & RBAC: flows, token/session model, RBAC route matrix, password policy. *(Phase 3)* |
| [design-system/](./design-system/00-index.md) | ✅ Authored | **Spec tree** — tokens, atomic boundaries, component inventory w/ props, a11y. *(Phase 4)* |

## Phase specs

Each phase has a stub here; its detailed required specs (below) are authored when the phase begins.

| Phase | Spec | Status |
|---|---|---|
| 1 | [phases/01-foundation.md](./phases/01-foundation.md) | ✅ Complete |
| 2 | [phases/02-data.md](./phases/02-data.md) | ✅ Complete |
| 3 | [phases/03-identity.md](./phases/03-identity.md) | ✅ Complete |
| 4 | [phases/04-design-system.md](./phases/04-design-system.md) | ✅ Complete |
| 5 | [phases/05-discovery.md](./phases/05-discovery.md) | 📝 Stub |
| 6 | [phases/06-booking.md](./phases/06-booking.md) | 📝 Stub |
| 7 | [phases/07-host.md](./phases/07-host.md) | 📝 Stub |
| 8 | [phases/08-admin.md](./phases/08-admin.md) | 📝 Stub |
| 8 | [phases/error-and-empty-states.md](./phases/error-and-empty-states.md) | 📝 Stub |

## Planned specs (not yet written)

These are placeholders for the SDD specs we'll author as each area is built. No implementation
should begin on one of these until its spec exists.

| Planned spec | Domain |
|---|---|
| `identity-and-rbac.md` | Auth (JWT/OAuth2), sessions, roles (guest/host/admin), route guards. |
| `chef-onboarding-and-verification.md` | Host onboarding wizard, KYC submission, admin verification queue state machine. |
| `events.md` | Event lifecycle: create/edit/publish/unpublish/cancel, capacity, scheduling. |
| `booking-and-concurrency.md` | Seat allocation, transactional booking flow, overbooking prevention. **(Critical path.)** |
| `payments.md` | Stripe checkout, refunds, host payouts (Connect), payment-failure handling. |
| `reviews-and-moderation.md` | Review submission, aggregation onto chef profiles, admin moderation. |
| `design-system.md` | Design tokens, theme toggle, Atomic Design component inventory. |
