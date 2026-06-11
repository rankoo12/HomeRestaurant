# Phase 8 — Admin, Edge States & Hardening

**Branch:** `phase-8-admin` · **Depends on:** Phase 7 · **Status:** ✅ Complete — approved scope decisions applied (no admin password reset; `admin` grants seed/DB-only; no audit table — KYC trail + structured logs; suspend unpublishes without auto-refunds)

## Objective
Close the loop: the admin portal (the humans behind the trust promises), every remaining edge/error
state, and hardening for delivery. **No new guest/host feature surface.**

## In scope
- `/admin`: platform metrics (pending verifications, flagged reviews, users by role, bookings +
  gross revenue last 30d, upcoming events) + payout ledger admin (mark-paid).
- `/admin/verifications`: approve/reject queue → flips chef state, grants badges, stores reject
  notes ([chef-onboarding-and-verification.md §11](../chef-onboarding-and-verification.md)).
- `/admin/users`: directory — search/filter, suspend/unsuspend (kills sessions + unpublishes the
  host's events), role change guest⇄host ([admin.md](../admin.md) §4/§8).
- `/admin/moderation`: flagged-review queue — dismiss flag / remove review
  ([reviews-and-moderation.md §11](../reviews-and-moderation.md)).
- Edge states finished: branded 404, error boundaries, loading skeletons, 429 surfacing
  ([error-and-empty-states.md](./error-and-empty-states.md)).
- Hardening: rate limiting (auth + abuse-prone endpoints), helmet headers, final green run,
  `docs/deploy.md` ([admin.md §9](../admin.md)).

## Out of scope
- Admin password reset (no email infra — admin.md §11), granting `admin` via API, audit-log table,
  Stripe Connect transfers, CSRF/2FA/CAPTCHA, analytics charts, `/host/ai-assistant` (permanently).

## Requires specs
- [`docs/specs/admin.md`](../admin.md) ✅ — admin portal, user management, payout admin, hardening.
- [`docs/specs/chef-onboarding-and-verification.md` §11](../chef-onboarding-and-verification.md) ✅ — approve/reject queue.
- [`docs/specs/reviews-and-moderation.md` §11](../reviews-and-moderation.md) ✅ — moderation actions.
- [`./error-and-empty-states.md`](./error-and-empty-states.md) ✅ — expanded with the shipped/remaining audit.

## Acceptance checklist
- [x] Admin dashboard shows real metrics; every tile links to its queue. *(`GET /api/admin/metrics`; KPI grid on `/admin` with queue links + pending-payout ledger.)*
- [x] Verification approve/reject flips chef state, grants badges, stores notes — and the publish
      gate opens/stays shut accordingly (cross-tested with events). *(admin suite asserts 403 `VERIFICATION_REQUIRED` before approve, 200 publish after.)*
- [x] User management: suspend kills sessions + unpublishes events + blocks login; unsuspend
      restores login only; role changes guarded (no admin grants, no self-targeting). *(all four self-protection rejections tested.)*
- [x] Moderation: dismiss keeps the review, remove deletes it and `chef_stats` self-corrects. *(view recount asserted before/after delete.)*
- [x] Payout mark-paid flows through to the host earnings screen. *(host `GET /api/host/earnings` asserted post-mark-paid.)*
- [x] Branded 404 + error boundaries + loading skeletons + admin empty states shipped. *(`not-found.tsx`, `error.tsx`, `global-error.tsx`, 4 `loading.tsx` skeletons, vitest render assertions.)*
- [x] Rate limiting live (auth endpoints provably 429) and disabled under test. *(11th login → 429 `RATE_LIMITED` in its own suite; all other suites run unlimited.)*
- [x] Final `typecheck` + `lint` + full test suites green in both workspaces; `docs/deploy.md` written.
