# Events — write side (host event lifecycle)

> **Cross-cutting spec for Phase 7.** The host's event builder and lifecycle:
> create / edit / publish / unpublish / cancel / duplicate / complete, plus the guest roster and the
> host dashboard reads. The **read side** (discovery) shipped in Phase 5
> ([discovery/01-events-read-api.md](./discovery/01-events-read-api.md)) and is unchanged. Builds on
> [data/04-events-tables.md](./data/04-events-tables.md) and must never violate the booking
> invariants in [booking-and-concurrency.md](./booking-and-concurrency.md).
>
> **Status:** ✅ Authored — ready for review. Implementation has NOT started.

---

## 1. Purpose and scope

Hosts create and manage dining events; everything money- or seat-adjacent must respect the Phase 6
machinery (live holds, confirmed bookings, refunds).

| Phase 7 (this spec) | Phase 8 / deferred |
|---|---|
| Event CRUD + status machine, host APIs | Admin force-unpublish/moderation of events |
| Guest roster (dietary + payment status) | Photo upload (no storage infra — seeds only, see §10) |
| Host dashboard KPIs | Messaging/unread counts (notifications, non-realtime — Phase 7 *only if time allows*, else 8) |
| Auto-completion of past events | |

## 2. Current scaffolding / state

- `events`, `event_courses`, `event_tags` tables complete (Phase 2); statuses
  `draft/published/unpublished/cancelled/completed` exist in the enum since migration 0001.
- `EventRepository` has `create` (atomic with courses/tags), `findBySlug`, `findById`,
  `findByIdForUpdate`, `incrementSeatsBooked`, `list`, `listForDiscovery`. **No update/delete/status
  methods; no host routes; no service.**
- Phase 6 gives: `withTransaction` + event-row locking protocol, `PaymentService.refundBooking()`
  (full refund primitive), `BookingRepository.listByGuest`, seat-hold machinery, in-process sweeper.
- `/host/events`, `/host/events/create`, `/host/events/[id]/guests`, `/host/dashboard` render
  `PlaceholderPage`.

## 3. User flows

**Create (event builder, `/host/events/create`)** — title, cuisine, short description, neighborhood,
date/time, duration, price, capacity, courses (the menu), tags, image seed → saved as **`draft`**.

**Publish** — allowed iff the chef's `verification_status = 'approved'`
([chef-onboarding-and-verification.md](./chef-onboarding-and-verification.md) §3) and the event
validates (§5). Published events appear in discovery immediately.

**Unpublish** — hides from discovery; **existing confirmed bookings stay valid** (guests already
paid); new holds are impossible (hold transaction requires `status = 'published'` — already enforced
in Phase 6 code).

**Cancel** — terminal. In one flow: status → `cancelled`; every **live hold** released and its
pending booking cancelled; every **confirmed booking** refunded in full via the Phase 6
`refundBooking` primitive (which decrements `seats_booked` per refund); guests notified through the
`NotificationService` seam. Refunds are Stripe network calls → executed sequentially *outside* the
status transaction, same compensation posture as payments.md F4 (a failed refund leaves the
queryable `succeeded`+`cancelled` pair for manual follow-up).

**Duplicate** — copy of title/menu/tags/pricing/capacity with a fresh slug (`-2` suffix style), no
date, status `draft`.

**Complete** — automatic, not a host action: when `starts_at + duration` has passed, `published` →
`completed`. **Mechanism:** the Phase 6 in-process sweeper gains a second status-guarded UPDATE
(hygiene-style, idempotent). Completion matters: it feeds `chef_stats.dinners_hosted` and gates
review eligibility ([reviews-and-moderation.md](./reviews-and-moderation.md)).

**Edit** — see the mutability matrix in §5.

## 4. Backend API requirements

All host-scoped routes: `preHandler: [authenticate, requireRole('host', 'admin')]` + **ownership
check** (`event.chef_id === req.user.sub`, admin exempt); non-owner → 404 (not 403 — don't leak).
Zod at every boundary; slugs server-generated from title (unique).

| Endpoint | Behavior |
|---|---|
| `GET /api/host/events` | The chef's own events, all statuses, with per-event booked/held counts. |
| `POST /api/host/events` | Create draft (courses + tags atomic). 201. |
| `GET /api/host/events/:id` | Full detail incl. courses/tags (drafts included — unlike the public read). |
| `PUT /api/host/events/:id` | Edit per the mutability matrix (§5). 409 `INVALID_EVENT_STATE` on violations. |
| `POST /api/host/events/:id/publish` | Gate: chef approved + event valid. 403 `VERIFICATION_REQUIRED` if not approved. |
| `POST /api/host/events/:id/unpublish` | `published` → `unpublished`. Idempotent. |
| `POST /api/host/events/:id/cancel` | The cancel flow from §3. Idempotent. Response includes `{ refundedBookings: n }`. |
| `POST /api/host/events/:id/duplicate` | New draft copy. 201. |
| `GET /api/host/events/:id/guests` | Roster: per booking — guest name, avatarSeed, seats, `dietary_prefs` (from `users`), booking status, payment status. Confirmed + pending listed; cancelled/refunded grouped separately. |
| `GET /api/host/dashboard` | KPIs: upcoming events count, seats sold (Σ confirmed seats on future events), earnings to date (Σ payout `net_cents`, see payments.md §11), rating (`chef_stats`), next event + its roster preview. |

New error codes: `INVALID_EVENT_STATE` (409), `VERIFICATION_REQUIRED` (403).

## 5. Database / model requirements

No schema changes. Validation (zod, service-enforced):
- title 4–80; shortDescription 20–500; neighborhood/cuisine non-empty; `priceCents` 1000–50000
  ($10–$500); `seatsTotal` 2–24; `durationMinutes` 60–480; `startsAt` ≥ 48h in the future at
  publish time; 1–8 courses; ≤ 8 tags.

**Status machine** (service-enforced; enum already constrains values):
```
draft ──publish──► published ──unpublish──► unpublished ──publish──► published
  │                    │                          │
  └──cancel──►   cancelled ◄──cancel──────────────┘        published ──(time passes)──► completed
```
`cancelled` and `completed` are terminal. `draft` may be hard-deleted only while it has zero
bookings/holds (RESTRICT FKs are the backstop).

**Mutability matrix** (the seat-safety rules):
| Field | draft | published, no bookings/holds | published, with bookings |
|---|---|---|---|
| title/description/courses/tags/imageSeed | ✅ | ✅ | ✅ (cosmetic) |
| priceCents | ✅ | ✅ | ❌ (guests already paid a price) |
| startsAt/duration | ✅ | ✅ | ❌ (reschedule = cancel + recreate) |
| seatsTotal increase | ✅ | ✅ | ✅ |
| seatsTotal decrease | ✅ | ✅ | only down to `seats_booked + live holds` (checked **under the event row lock**) |

The `seatsTotal` decrease runs in a `FOR UPDATE` transaction reusing the booking module's
availability read — the one new write that interacts with Phase 6 concurrency.

## 6. Frontend page / component requirements

- `/host/events` — table/cards of own events with status `Badge`, seats meter, actions
  (publish/unpublish/duplicate/cancel with confirm dialog).
- `/host/events/create` (and `/host/events/[id]/edit` reusing it) — the builder: sections for
  basics, schedule/pricing/capacity, menu courses (orderable list), tags (Chip multi-select),
  image-seed picker (`FoodImage` previews). Composes existing atoms; new molecules (e.g.
  `CourseEditor`) join the design-system inventory.
- `/host/events/[id]/guests` — roster table: Avatar + name, seats, dietary chips, payment status
  badge; empty state "No guests yet".
- `/host/dashboard` — `Kpi` tiles (already exist) + verification banner + next-event card.
- All pages live under the existing role-gated host layout; pending-verification hosts see drafts
  with a disabled Publish + explainer.

## 7. Permissions / RBAC rules

- All `/api/host/events*`: host/admin role **and** row ownership (admin exempt). Already-standard
  server-side 403/404 contract.
- Publish additionally requires `verification_status = 'approved'` — checked server-side at the
  transition, never trusted from the client.
- Public discovery continues to expose only `published` (existing).

## 8. Edge states

- Publish while unverified → 403 `VERIFICATION_REQUIRED` + dashboard banner CTA.
- Cancel with refund failures → event still `cancelled`; response reports per-booking refund
  outcomes; failures logged for manual compensation (payments.md F4 posture).
- Seats decrease below committed seats → 409 `INVALID_EVENT_STATE` with
  `{ seatsCommitted }` details.
- Edit of a cancelled/completed event → 409.
- Roster on an event with zero bookings → empty state, not error.
- Duplicate slug collisions → server appends suffix (never errors).

## 9. Test plan

Integration (`modules/events/__tests__/`, extending the existing suite):
1. Full lifecycle: create draft → publish (approved chef) → unpublish → republish → cancel.
2. Publish gate: pending-verification chef → 403 `VERIFICATION_REQUIRED`.
3. Ownership: another host's event → 404 on read/write; admin succeeds.
4. Mutability: price/schedule edit rejected once a confirmed booking exists; cosmetic edits allowed.
5. **Seats-decrease race:** event with 5 booked+held seats; concurrent decrease-to-4 and new-hold —
   exactly one of the conflicting pair wins (reuses the Phase 6 lock protocol).
6. Cancel with one confirmed booking + one live hold: booking refunded (FakeGateway), `seats_booked`
   back to 0, hold released, payment `refunded`.
7. Auto-completion: seeded past event flips to `completed` on sweep; `chef_stats.dinnersHosted`
   reflects it.
8. Roster: dietary prefs + payment status correct per booking; non-owner 404.
9. Validation table tests for §5 bounds.

## 10. Open questions before implementation

1. **Photos.** Pages spec says "photo uploads"; no storage infra exists. Proposed: keep the
   generated `FoodImage` seed system (pick-a-seed UI) for the university scope; real uploads
   deferred indefinitely. Confirm.
2. **Reschedule.** Blocked once booked (cancel + recreate instead). Acceptable, or is an in-place
   reschedule with guest re-consent wanted (significant extra scope)?
3. **48-hour publish lead time** (§5) — reasonable default; confirm the product wants a different
   minimum.
4. **Messaging/unread on the dashboard** (pages spec mentions it): propose deferring messaging
   entirely to Phase 8 with the rest of notifications UX. Confirm.
