# Phase 7 — Host & Reviews

**Branch:** `phase-7-host` · **Depends on:** Phases 3, 6 · **Status:** 📝 Not started

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
- `docs/specs/chef-onboarding-and-verification.md` *(to author this phase)* — wizard steps, KYC document model, food-safety declarations, verification-queue state machine (host side).
- `docs/specs/events.md` *(write side — finalize if not done in P5)* — event create/edit/publish lifecycle, validation rules.
- `docs/specs/payments.md` *(host side)* — Stripe Connect onboarding, payout schedule, fee model.
- `docs/specs/reviews-and-moderation.md` *(write side)* — review submission eligibility, content rules.

## Acceptance checklist
- [ ] Host completes onboarding and lands in the verification queue (pending).
- [ ] Host CRUDs events; builder validates capacity/pricing/schedule.
- [ ] Guest roster shows dietary + payment status per booking.
- [ ] Earnings dashboard reflects real payouts and fees.
- [ ] A guest who attended an event can submit a review; it aggregates to the chef profile.
