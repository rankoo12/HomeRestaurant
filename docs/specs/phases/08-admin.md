# Phase 8 — Admin, Edge States & Hardening

**Branch:** `phase-8-admin` · **Depends on:** Phase 7 · **Status:** 📝 Not started

## Objective
Close the loop: admin portal, every remaining edge/error state, and hardening for delivery.

## In scope
- `/admin`: platform metrics (active users, revenue, new bookings, system health).
- `/admin/verifications`: review queue — approve/reject chefs + KYC docs (flips host verification state).
- `/admin/users`: directory — suspend accounts, reset passwords, change roles (RBAC).
- `/admin/moderation`: review reported events/reviews, enforce quality standards.
- All edge/error pages (see `error-and-empty-states.md`).
- Hardening: final lint/typecheck/test pass, performance pass, deploy notes.

## Out of scope
- New feature surface beyond admin + edge states.

## Requires specs
- `docs/specs/identity-and-rbac.md` *(admin powers: suspend, role change — extend from P3)*.
- `docs/specs/chef-onboarding-and-verification.md` *(admin approve/reject side of the verification queue)*.
- `docs/specs/reviews-and-moderation.md` *(moderation actions)*.
- `docs/specs/phases/error-and-empty-states.md` — the 404 / 403 / overbooking / payment-failed / empty-state contract.

## Acceptance checklist
- [ ] Admin dashboard shows real metrics.
- [ ] Verification queue approve/reject flips chef state and unlocks/blocks event publishing.
- [ ] User management can suspend, reset, and change roles.
- [ ] Moderation can act on reported content.
- [ ] All 5 edge cases from the page spec are handled gracefully.
- [ ] Final `typecheck` + `lint` + tests green; deploy notes written.
