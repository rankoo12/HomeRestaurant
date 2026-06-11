# Phase 7 — Host & Reviews

**Branch:** `phase-7-host` · **Depends on:** Phases 3, 6 · **Status:** ✅ Complete — approved scope decisions applied (KYC metadata-only, payouts ledger-only, messaging deferred to Phase 8)

## Objective
The host portal and the review loop: onboarding with KYC submission, host dashboard, event builder (CRUD),
guest roster, earnings/payouts, and post-event guest reviews.

## In scope
- `/host/onboarding`: multi-step wizard — profile, KYC document submission, food-safety declarations → enters verification queue (pending).
- `/host/dashboard`: KPIs (upcoming dinners, seats sold, earnings, rating) + recent activity.
- `/host/events` + `/host/events/create`: event CRUD (publish/unpublish/duplicate), capacity/pricing/schedule/photos.
- `/host/events/:id/guests`: roster with dietary restrictions + payment status.
- `/host/earnings`: revenue, platform fees, payouts (Stripe Connect).
- `modules/reviews` (write side): `/guest/reviews/new` after an attended event; aggregation onto chef profile.

## Out of scope
- Admin approval of KYC (Phase 8). `/host/ai-assistant` (out of scope entirely).

## Requires specs
- [`docs/specs/chef-onboarding-and-verification.md`](../chef-onboarding-and-verification.md) ✅ — wizard steps, KYC document model, food-safety declarations, verification-queue state machine (host side).
- [`docs/specs/events.md`](../events.md) ✅ — event write side: builder, status machine, mutability vs bookings, cancel-with-refunds, roster, dashboard.
- [`docs/specs/payments.md` §11](../payments.md) ✅ — host-payout ledger records + fee model (Stripe Connect money movement deferred — see §11 open question).
- [`docs/specs/reviews-and-moderation.md`](../reviews-and-moderation.md) ✅ — review submission eligibility, flag primitive (write side).

## Acceptance checklist
- [x] Host completes onboarding and lands in the verification queue (pending). *(wizard → `POST /api/host/onboarding`; profile + 2 KYC rows + role upgrade in one transaction; verified live.)*
- [x] Host CRUDs events; builder validates capacity/pricing/schedule. *(status machine + mutability matrix incl. the under-lock capacity floor; 48h publish lead time; publish gated on verification.)*
- [x] Guest roster shows dietary + payment status per booking. *(`GET /api/host/events/:id/guests` joins users.dietary_prefs + payments.status.)*
- [x] Earnings dashboard reflects real payouts and fees. *(payout ledger row per confirmed booking — net = seat subtotal; refunds flip pending payouts to failed; ledger-only per the approved Connect deferral.)*
- [x] A guest who attended an event can submit a review; it aggregates to the chef profile. *(eligibility: own confirmed booking + completed event, one per event; `chef_stats` view aggregates live; immutable; boolean flagging.)*
