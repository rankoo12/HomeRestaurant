# Reviews & Moderation — write side

> **Cross-cutting spec for Phase 7 (write side).** Review submission, eligibility, aggregation onto
> chef profiles, and the flag/report primitive. **Moderation actions** (admin queue, hide/delete,
> resolve flags) are Phase 8. Builds on [data/07-reviews-tables.md](./data/07-reviews-tables.md);
> the read side (profile/event review lists) shipped in Phase 5.
>
> **Status:** ✅ Authored — ready for review. Implementation has NOT started.

---

## 1. Purpose and scope

Transparent reviews are one of the platform's three trust pillars (CLAUDE.md). The integrity rule
this spec serves: **only a guest who verifiably paid for and attended a dinner can review it, once.**

| Phase 7 (this spec) | Phase 8 (deferred) |
|---|---|
| Review submission (`/guest/reviews/new`) + eligibility | Admin moderation queue (`/admin/moderation`) |
| Aggregation to chef profiles (already-live `chef_stats` view) | Hide/remove reviews, resolve/dismiss flags |
| Flag/report primitive (`is_flagged = true`) | Flagger identity/audit trail (needs a new table) |
| Guest dashboard "awaiting review" prompts | Host public replies to reviews |

## 2. Current scaffolding / state

- `reviews` table complete (Phase 2): rating CHECK 1–5, `is_flagged`, unique
  `(event_id, author_id)` — the DB-level one-review-per-guest-per-event guard.
- `chef_stats` VIEW already aggregates rating/count live — **no aggregation code needed, ever**.
- `ReviewRepository` has `create` + the read methods (Phase 5 uses them). **No write routes, no
  eligibility logic, no service.**
- `/guest/reviews/new` renders `PlaceholderPage`; `/guest/dashboard` is also a placeholder (its
  review prompts are specced here, the rest of the dashboard in [events.md](./events.md) §6).
- Phase 6/7 prerequisites in place: bookings carry `confirmed` status; events auto-flip to
  `completed` (events.md §3) — both eligibility inputs.

## 3. User flows

**Submit a review** — `/guest/reviews/new?bookingId=<id>`:
1. Page loads the booking (owner-only): event title, date, chef. If ineligible (§below) it renders
   the specific blocked state, not a form.
2. Guest picks 1–5 stars (required) + writes the body (required) → submit → success state links to
   the event page, where the review is immediately visible (and the chef's rating has already
   moved — the view derives it).

**Eligibility (all server-enforced at submit):**
- The booking exists, belongs to the requester, and is `confirmed`.
- The booking's event is `completed` (i.e., the dinner actually happened).
- No existing review by this guest for this event (DB unique index is the backstop; the API
  pre-checks for a clean 409).

**Prompted from the guest dashboard** — "Dinners awaiting your review": confirmed bookings on
completed events without a review → CTA into the form. (Dashboard list endpoint below.)

**Flag a review** — any authenticated user can report a review (button on event/chef pages):
sets `is_flagged = true`. Idempotent; no flagger identity stored in Phase 7 (schema has no column —
adding an audit trail is a Phase 8 decision, §10). Flagged reviews **remain visible** until an
admin acts (Phase 8); flagging is a signal, not a removal.

## 4. Backend API requirements

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /api/reviews` | authenticated | Body `{ bookingId, rating 1–5, body }`. Eligibility per §3; `event_id` + `chef_id` derived **server-side from the booking** (never client-supplied — integrity note in data/07). 201 `{ review }`. Errors: 404 (booking not yours/missing), 409 `REVIEW_NOT_ELIGIBLE` (not confirmed / event not completed), 409 `ALREADY_REVIEWED`. |
| `GET /api/guest/reviewable` | authenticated | The dashboard prompt list: confirmed bookings on completed events with no review yet → `[{ bookingId, eventTitle, eventSlug, startsAt }]`. |
| `POST /api/reviews/:id/flag` | authenticated | Sets `is_flagged = true`. 200 `{ flagged: true }`, idempotent. 404 if review missing. |

New error codes: `REVIEW_NOT_ELIGIBLE` (409), `ALREADY_REVIEWED` (409).
No rate limiting in Phase 7 (platform-wide gap, already a known issue; flag spam lands in Phase 8
hardening with the rest).

## 5. Database / model requirements

No schema changes. Service rules:
- rating: integer 1–5 (zod + DB CHECK).
- body: 10–2000 chars, trimmed, non-empty after trim.
- `chefId` set from `events.chef_id` at insert (the denormalization-integrity rule from data/07).
- `ReviewRepository` gains: `findByEventAndAuthor(eventId, authorId)`, `setFlagged(id, flagged)`,
  and a `listReviewableBookings(guestId)` query (joins bookings → events → anti-join reviews).

## 6. Frontend page / component requirements

- `/guest/reviews/new` — server component loads booking + eligibility; client form: `Stars` as an
  **interactive input** (the existing atom is display-only — extend it with an `onChange` mode or
  add a `StarsInput` atom to the design-system inventory), textarea with counter, submit; blocked
  states per §8. Mobile-friendly single column.
- Guest dashboard section "Awaiting your review" — list from `GET /api/guest/reviewable`, each with
  a CTA; empty state ("Nothing to review — book your next dinner").
- Flag affordance — small "report" action on `ReviewCard` (menu or icon-button); confirm dialog;
  works on event detail + chef profile. `ReviewCard` gains an optional `onReport` prop.

## 7. Permissions / RBAC rules

- Submit: any authenticated user **who owns the booking** (ownership is the real gate, not role —
  hosts/admins who dined as guests may review).
- A chef can never review their own event (structurally impossible: chefs can't book their own
  events — Phase 6 rule — and reviews require a booking; assert it in tests anyway).
- Flag: any authenticated user.
- Moderation actions: admin only, Phase 8.

## 8. Edge states

- Event not completed yet → "You can review after the dinner" + event date (409 from API).
- Already reviewed → shows the existing review with a link to the event (409 from API).
- Booking cancelled/refunded → "Only attended dinners can be reviewed" (409).
- Booking not yours / unknown → 404 page.
- Review body too short → inline validation before submit.
- Flagging an already-flagged review → 200, no-op.

## 9. Test plan

Integration (`modules/reviews/__tests__/`):
1. Happy path: confirmed booking + completed event → 201; `chef_stats.rating`/`review_count` move
   immediately (assert via view query).
2. Eligibility rejections: pending booking → 409; confirmed booking + future event → 409;
   cancelled/refunded booking → 409; foreign booking → 404.
3. Duplicate: second review for the same event/guest → 409 `ALREADY_REVIEWED`; the DB unique index
   also holds under a direct-insert race (two parallel submits → exactly one 201).
4. `chef_id`/`event_id` from the client payload are ignored — derived from the booking.
5. Reviewable list: returns exactly the unreviewed completed-confirmed set; empties after submit.
6. Flag: sets `is_flagged`, idempotent, requires auth; review stays publicly visible.
7. Rating bounds + body length validation table.

## 10. Open questions before implementation

1. **Flag audit trail.** Phase 7 stores only the boolean (schema as-is). If Phase 8 moderation
   needs *who/why/when*, that's a new `review_flags` table — decide at Phase 8 spec time. OK to
   ship boolean-only now? *(Resolved at Phase 7 implementation: boolean-only, approved. Phase 8
   decision below: stays boolean-only — §11.)*
2. **Review editing/deletion by the author.** Not in the pages spec; proposed: immutable in
   Phase 7 (matches review-integrity posture). Confirm. *(Resolved: immutable, approved.)*
3. **Review window.** Should eligibility expire (e.g., 30 days after the event)? Proposed: no
   window in Phase 7 — simpler, and the prompt list keeps it organic. Confirm. *(Resolved: no
   window, approved.)*

---

## 11. Phase 8 — moderation actions (authored at Phase 8 spec time)

> The admin half this spec deferred. Shared admin shell/RBAC/test plan live in
> [admin.md](./admin.md); this section owns the domain rules. **Status: ✅ implemented (Phase 8)** —
> `/admin/moderation` + the queue/dismiss/remove endpoints; tested in `modules/admin/__tests__/`.

**Queue contract** — `GET /api/admin/reviews/flagged`: reviews with `is_flagged = true`, oldest
flag first, each with full context (review text + rating, author display, chef, event title) — an
admin decides from the queue without hunting.

**Actions (both idempotent-safe):**
- **Dismiss** — `POST /api/admin/reviews/:id/dismiss-flag`: `is_flagged → false`; the review stays
  exactly as it was. For flags that don't violate standards.
- **Remove** — `DELETE /api/admin/reviews/:id`: **hard delete**. Rationale: the schema has no
  `hidden` column, reviews have no replies/threads to orphan, and `chef_stats` is a derived VIEW —
  rating and count self-correct on the next read with zero extra code. A soft-delete column would
  add a migration plus filter-everywhere complexity for no product gain at this scope. The deleted
  review's author can review that event again (the unique index row is gone) — acceptable: removal
  usually means the content was unacceptable, not the opinion.

**Stays boolean-only:** no `review_flags` table in Phase 8 either — the queue needs *what's
flagged*, not *who flagged it*, and the platform has no flag-abuse problem at university scale.
(Future: add the table if flag spam ever matters; rate limiting on the flag endpoint — admin.md §9
— is the Phase 8 mitigation.)

**Out of scope (future):** event/host moderation actions beyond suspension (admin.md), host public
replies, appeal flows, automated content screening.
