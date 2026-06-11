# Admin Portal & Hardening — Phase 8

> **Cross-cutting spec for Phase 8.** The admin dashboard, user management (the admin powers the
> master plan assigned to "identity-and-rbac": suspend, role change), the payout admin view, and the
> platform-hardening checklist (rate limiting, production-readiness). The two queue surfaces have
> their detail in their domain specs — verification queue in
> [chef-onboarding-and-verification.md §11](./chef-onboarding-and-verification.md), moderation queue
> in [reviews-and-moderation.md §11](./reviews-and-moderation.md) — this spec owns the shared admin
> shell, RBAC, and everything cross-domain.
>
> **Status:** ✅ Implemented (Phase 8). The §11 open questions were decided before
> implementation: (1) password reset descoped — suspension is the compromise response;
> (2) `admin` grants are seed/DB-only — no API path; (3) no `admin_actions` table —
> KYC trail + structured logs; (4) suspend unpublishes, never auto-refunds.

---

## 1. Purpose and scope

Phase 8 closes the trust-and-safety loop (admins are the humans behind the platform's promises) and
hardens the existing product for delivery. **It adds no new guest/host feature surface.**

| Required (Phase 8) | Optional / future (not Phase 8) |
|---|---|
| Admin dashboard with real metrics | Charts/time-series analytics |
| Verification queue (approve/reject — domain spec §11) | Re-verification campaigns, document expiry |
| User management: suspend/unsuspend, role change | Admin-initiated password reset (no email infra — see §11) |
| Moderation queue for flagged reviews | Event/content moderation beyond reviews, host replies |
| Payout admin view + mark-paid (ledger) | Stripe Connect transfers (permanently descoped — payments.md §11) |
| Rate limiting on auth + abuse-prone endpoints | WAF/IP reputation, CAPTCHA |
| Edge states finished ([error-and-empty-states](./phases/error-and-empty-states.md)) | — |
| Deploy notes + final green run | CI/CD pipelines, IaC |

**No audit-log table.** The KYC audit trail already exists (`chef_verifications.reviewed_by/notes/
reviewed_at`); other admin actions are covered by structured logs. A generic `admin_actions` table is
deliberate enterprise-feature avoidance for this scope (open question §11 if the graders want it).

## 2. Current state / existing scaffolding

- **RBAC is done:** `requireRole('admin')` middleware tested since Phase 3; `/api/admin/ping` probe
  exists; the frontend `/admin/**` layout guards via `requireArea('admin')`.
- **Frontend:** 4 placeholder pages (`/admin`, `/admin/verifications`, `/admin/users`,
  `/admin/moderation`) under the admin layout.
- **Data layer ready:** `users.is_suspended`, `user_role` enum, `chef_profiles.verification_status`,
  `chef_verifications` (incl. `reviewed_by`/`notes`), `reviews.is_flagged`, `payouts.status/paid_at`
  — **no migrations expected** (§7).
- **Hooks built earlier for this phase:** `RefreshTokenStore.revokeAllForUser` (Phase 3, "for
  suspend"); login/refresh already reject suspended users (`ACCOUNT_SUSPENDED`); publish already
  gates on `verification_status` (Phase 7); seeds create `paid` payouts.
- **No admin routes exist** beyond the probe; no admin services; no rate limiting anywhere
  (documented known gap since the Phase 5 review).

## 3. Admin user flows

- **Dashboard (`/admin`)** — at a glance: pending verifications (with CTA), flagged reviews (CTA),
  user counts by role, bookings + gross revenue (last 30 days), upcoming published events. Each KPI
  links to its queue/page.
- **Verifications (`/admin/verifications`)** — pending applications oldest-first; open one → profile
  + KYC submissions; **approve** (chef may publish; badges granted) or **reject with required
  notes** (host sees them on the dashboard banner and may resubmit). Detail in the domain spec §11.
- **Users (`/admin/users`)** — search/filter directory; **suspend** (with confirm: kills sessions,
  unpublishes a host's events) / **unsuspend**; **change role** (guest ⇄ host promotion edge cases
  in §8; admin-granting reserved — §11).
- **Moderation (`/admin/moderation`)** — flagged reviews queue; **dismiss flag** (review stays) or
  **remove review** (hard delete; stats self-correct via the `chef_stats` view). Detail in the
  domain spec §11.
- **Payouts (section on `/admin`, not a 5th page)** — pending payout ledger across chefs;
  **mark paid** records that money moved outside the platform (ledger-only world).

## 4. Backend API requirements

All under `/api/admin/**`: `preHandler: [authenticate, requireRole('admin')]` (matrix row already
exists). Zod-validated; standard error envelope; list endpoints paginate (`limit`/`offset`, default
50). New module: `backend/src/modules/admin/` (interface-first service over existing repositories —
admin is a consumer of other domains, not a new domain with its own tables).

| Endpoint | Behavior |
|---|---|
| `GET /api/admin/metrics` | Dashboard numbers: `{ pendingVerifications, flaggedReviews, usersByRole, bookingsLast30d, grossRevenueCentsLast30d (succeeded payments), upcomingPublishedEvents }`. |
| `GET /api/admin/verifications` | Pending chef applications, oldest first (profile + user display + KYC rows). |
| `POST /api/admin/verifications/:chefId/approve` | Domain spec §11: status → `approved`, badges granted, `reviewed_by/at` stamped. Idempotent. |
| `POST /api/admin/verifications/:chefId/reject` | Body `{ notes: string (required, 4–500) }` → status `rejected`, notes stored. Idempotent. |
| `GET /api/admin/users` | Directory: `q` (name/email search), `role`, `suspended` filters + pagination. Never returns password hashes (structurally impossible — `User` type has none). |
| `POST /api/admin/users/:id/suspend` | `is_suspended = true` + `revokeAllForUser` + unpublish the user's published events (if host). Cannot target an admin or yourself (§8). Idempotent. |
| `POST /api/admin/users/:id/unsuspend` | Clears the flag. Events stay unpublished (host republishes deliberately). Idempotent. |
| `POST /api/admin/users/:id/role` | Body `{ role: 'guest' \| 'host' }` — `admin` not grantable via API (§11). Guest→host requires an existing chef profile (else 409). |
| `GET /api/admin/payouts` | Ledger across chefs: filter by `status`; rows join chef name + event title. |
| `POST /api/admin/payouts/:id/mark-paid` | `pending` → `paid` + `paid_at = now()`. Only from `pending` (409 otherwise). Idempotent on `paid`. |
| `GET /api/admin/reviews/flagged` + actions | Moderation queue + dismiss/remove — domain spec §11. |

New error code: none expected — reuse `VALIDATION_ERROR`/`NOT_FOUND`/`INVALID_BOOKING_STATE`-style
409s via `INVALID_EVENT_STATE`? No: add **`INVALID_STATE` (409)** as the generic
wrong-current-state code for admin actions (payout not pending, role change without profile) rather
than overloading event/booking-specific codes.

## 5. Frontend page requirements

All four placeholders become real pages under the existing admin layout; shared admin nav links
(Dashboard / Verifications / Users / Moderation). Composes existing primitives (`Kpi`, `Badge`,
`Avatar`, `Input`, `Button`, table pattern from `/host/earnings`); any new molecule joins the
design-system inventory. Mutations go through the existing authed proxy (extend its allowlist with
`admin/`).

- `/admin` — KPI grid (each tile links to its queue) + pending-payouts table with mark-paid.
- `/admin/verifications` — queue list → expandable detail (profile fields, KYC rows with
  `document_ref` metadata) → Approve / Reject-with-notes (textarea, required).
- `/admin/users` — search input + role/suspended filters, paginated table, per-row actions with
  confirm dialogs. Suspended rows visually muted.
- `/admin/moderation` — flagged review cards (full text + author + chef + event context) →
  Dismiss / Remove with confirm.
- Empty states for every queue ("Nothing waiting — nice."), per the edge-states contract.

## 6. RBAC / permissions

- Everything here: `admin` only, enforced server-side (the existing matrix row). Frontend guard is
  UX only, as always.
- **Self-protection invariants** (service-enforced, tested): an admin cannot suspend themselves,
  cannot suspend another admin, cannot change an admin's role, and cannot demote themselves. Keeps
  one fat-finger away from locking the platform out.
- Role grants to `admin` happen via seed/DB only in this product (open question §11).

## 7. Database / model requirements

**No new migrations required.** Everything reads/writes existing columns. Service-level additions
only: `UserRepository.list(filters)` + `setSuspended`; `ChefRepository.listPendingVerifications`;
`PayoutRepository.listAll(filters)` + `markPaid`; `ReviewRepository.listFlagged` + `delete`;
`EventRepository.unpublishAllForChef`. (If §11's audit-table question comes back "yes", that becomes
one additive migration — decide before implementation.)

## 8. Edge states

- Queues empty → friendly empty states (never blank).
- Approve/reject on an already-actioned application → idempotent 200 with current state (two admins
  racing the same item is a no-op for the second).
- Suspending a host with **future confirmed bookings**: events are unpublished (no new bookings) but
  existing bookings stay valid; the admin UI shows a count and a reminder that refunds, if wanted,
  go through the host-cancel flow per event. (Auto-refund-on-suspend is deliberately not automatic —
  destructive money movement needs a human per event.)
- Role change guest→host without a chef profile → 409 with explanation (profile comes from
  onboarding, not from role bits).
- Mark-paid on a `failed` payout → 409 `INVALID_STATE`.
- Removing a review that was already removed → 404, handled gracefully in the UI (queue refresh).

## 9. Security / hardening requirements (the "hardening" half of Phase 8)

1. **Rate limiting** (`@fastify/rate-limit` — one new dependency):
   - `/api/auth/login` + `/api/auth/register`: 10/min per IP (brute-force/enumeration).
   - `/api/auth/refresh`: 30/min per IP.
   - `POST /api/reviews/:id/flag` + `POST /api/bookings/hold`: 30/min per user (abuse/QA noise).
   - Global default: 300/min per IP (backstop, generous).
   - 429 responses use the standard error envelope; limits configurable via env with sane defaults;
     **disabled under `NODE_ENV=test`**.
2. **Headers**: `@fastify/helmet` with defaults (CSP report-only initially — the Next app serves its
   own pages; the API only returns JSON).
3. **Suspension is total**: suspend revokes all refresh tokens (existing `revokeAllForUser`) — the
   ≤15-min access-token tail is accepted and documented (matches token spec).
4. **Final pass checklist** (acceptance items, not code): typecheck/lint/tests green in both
   workspaces · `npm audit` reviewed (known postcss advisory documented) · no `console.log` in src ·
   `.env.example` complete · seeds produce a demo-able state · **deploy notes** written
   (`docs/deploy.md`: env vars, migration order, Stripe webhook setup, the two in-process sweepers,
   single-instance assumption).
5. **Explicitly not in scope**: CSRF tokens (SameSite=Lax cookies + Bearer-proxy pattern already
   cover the API), 2FA, session device management, CAPTCHA.

## 10. Test plan

Integration (`modules/admin/__tests__/`):
1. Metrics: seeded state returns correct counts/sums; requires admin (403 for host/guest).
2. Verification queue: pending listed oldest-first; approve flips state + grants badges + stamps
   `reviewed_by` + **publish gate opens** (cross-test with events suite); reject stores notes +
   host resubmission returns it to the queue; double-action idempotent.
3. Users: search/filter/pagination; suspend kills refresh tokens (refresh → 401) and blocks login
   (`ACCOUNT_SUSPENDED`) and unpublishes the host's events; unsuspend restores login but not
   publication; self/admin-target protections all 4 rejected.
4. Role change: guest→host with profile works; without profile → 409; granting admin via API → 400.
5. Payouts: mark-paid only from pending; `paid_at` set; earnings screen reflects it (host side).
6. Moderation: flagged queue lists context; dismiss clears flag; remove deletes + `chef_stats`
   recomputes (rating/count drop); already-removed → 404.
7. Rate limiting: 11th login attempt in a minute → 429; disabled in the test env for all other
   suites (no flaky CI).

## 11. Open questions — RESOLVED (approved at Phase 8 implementation)

1. **Admin password reset** → **(a) descoped.** No temporary passwords, no reset flows;
   account compromise handling is suspension only.
2. **Granting `admin` role** → **seed/DB-only.** No admin-to-admin grant API, no UI
   privilege escalation (the role schema on `POST /users/:id/role` only accepts guest|host).
3. **Audit table** → **no.** Existing KYC trail fields (`chef_verifications.reviewed_by/
   reviewed_at/notes`) + structured logs; no migration.
4. **Suspend-host refund policy** → **confirmed.** Suspend unpublishes the host's events;
   confirmed bookings stay valid; refunds remain deliberate per-event admin/host actions.
