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
| [discovery/](./discovery/00-index.md) | ✅ Authored | **Spec tree** — events read API, chef-profile read API, discovery pages, states. *(Phase 5)* |
| [booking-and-concurrency.md](./booking-and-concurrency.md) | ✅ Authored — ready for review | Booking lifecycle, seat-hold model + TTL, transactional allocation (`FOR UPDATE`), overbooking contract, booking API, test plan. **(Critical path.)** *(Phase 6)* |
| [payments.md](./payments.md) | ✅ Authored — ready for review | Stripe Checkout Session flow, webhook handling + idempotency, payment state machine, failure UX, refund scope, env/CI strategy. *(Phase 6, guest side; §11 host-payout ledger added for Phase 7)* |
| [chef-onboarding-and-verification.md](./chef-onboarding-and-verification.md) | ✅ Authored — ready for review | Onboarding wizard, KYC submission model, role upgrade, verification states (host side; admin actions Phase 8). *(Phase 7)* |
| [events.md](./events.md) | ✅ Authored — ready for review | Event write side: builder, status machine, mutability rules vs bookings, cancel-with-refunds, roster, dashboard. *(Phase 7)* |
| [reviews-and-moderation.md](./reviews-and-moderation.md) | ✅ Authored — ready for review | Review submission eligibility, aggregation, flag primitive; §11 moderation actions added for Phase 8. *(Phases 7–8)* |
| [admin.md](./admin.md) | ✅ Implemented (Phase 8) | Admin portal: dashboard metrics, user management (suspend/role change), payout admin, rate limiting + hardening checklist. *(Phase 8)* |

## Phase specs

Each phase has a stub here; its detailed required specs (below) are authored when the phase begins.

| Phase | Spec | Status |
|---|---|---|
| 1 | [phases/01-foundation.md](./phases/01-foundation.md) | ✅ Complete |
| 2 | [phases/02-data.md](./phases/02-data.md) | ✅ Complete |
| 3 | [phases/03-identity.md](./phases/03-identity.md) | ✅ Complete |
| 4 | [phases/04-design-system.md](./phases/04-design-system.md) | ✅ Complete |
| 5 | [phases/05-discovery.md](./phases/05-discovery.md) | ✅ Complete |
| 6 | [phases/06-booking.md](./phases/06-booking.md) | ✅ Complete *(deferrals in [known-issues](../known-issues/phase-6-deferrals.md))* |
| 7 | [phases/07-host.md](./phases/07-host.md) | ✅ Complete *(KYC metadata-only, payouts ledger-only, messaging → Phase 8)* |
| 8 | [phases/08-admin.md](./phases/08-admin.md) | ✅ Complete *(approved scope: no admin password reset, `admin` grants seed/DB-only, no audit table, suspend never auto-refunds)* |
| 8 | [phases/error-and-empty-states.md](./phases/error-and-empty-states.md) | ✅ Complete — every remaining edge state shipped in Phase 8 |

## Planned specs (not yet written)

**None — every planned spec is now authored.** Two early placeholders were superseded rather than
written as standalone files: `identity-and-rbac.md` became the [identity/](./identity/00-index.md)
spec tree (Phase 3) with the admin powers (suspend, role change) specced in
[admin.md](./admin.md) §4/§6 (Phase 8); `design-system.md` became the
[design-system/](./design-system/00-index.md) spec tree (Phase 4).
