# Chef Onboarding & Verification — host side

> **Cross-cutting spec for Phase 7.** The onboarding wizard, KYC submission model, and the host side
> of the verification-queue state machine. The **admin approve/reject** action is Phase 8 (see §boundary
> in each section). Builds on the Phase 2 tables in [data/03-chef-tables.md](./data/03-chef-tables.md).
>
> **Status:** ✅ Authored — ready for review. Implementation has NOT started.

---

## 1. Purpose and scope

Trust & safety is a feature, not a checkbox (CLAUDE.md): a guest books a stranger's home because the
platform vouched for the host. This spec defines how a user **becomes** a host — profile, KYC
submission, food-safety declaration — and what an unverified host may and may not do.

| Phase 7 (this spec) | Phase 8 (deferred) |
|---|---|
| Onboarding wizard (`/host/onboarding`) | Admin verification queue UI (`/admin/verifications`) |
| `chef_profiles` + `chef_verifications` writes, role upgrade | Approve/reject actions, `reviewed_by`/`notes`, badge grants |
| Pending-state host dashboard experience | Suspension, re-verification demands |
| Re-submission after rejection | |

## 2. Current scaffolding / state

- Tables exist since Phase 2: `chef_profiles` (with `verification_status`, default `pending`),
  `chef_verifications` (audit trail: `kind`, `status`, `document_ref`, `reviewed_by`, `notes`),
  `chef_badges`. No migration changes needed.
- `ChefRepository` (`backend/src/modules/chef-onboarding/`) has `create`, `findByUserId`, badge ops,
  and the public read views (Phase 5). **No onboarding service, no verification writes, no routes.**
- `/host/onboarding` renders `PlaceholderPage`. The host layout already guards `/host/**` via
  `requireArea('host')` (host/admin only).
- Auth: registration forces role `guest` (identity spec); **no role-upgrade path exists yet**.

## 3. User flows

**Apply (the wizard)** — an authenticated *guest* at `/host/onboarding`:
1. **Profile** — display name (prefilled), `slug` (suggested from name, editable, uniqueness-checked),
   `cuisine`, `city`, `tagline`, `bio`, `coverSeed` pick.
2. **Identity (KYC)** — declares an ID document: type (passport / driver's license / national ID) +
   reference metadata. Stored as a `chef_verifications` row, `kind = 'id_document'`. (See §10 on
   document storage — Phase 7 stores an opaque `document_ref`, not file bytes.)
3. **Food safety** — declaration checkbox set (required) + optional certificate reference →
   `kind = 'food_safety_cert'` row.
4. **Submit** — one transaction: `chef_profiles` row created (`verification_status = 'pending'`),
   verification rows created, **user role upgraded `guest` → `host`**.

**Decision — role upgrades at submission, not approval.** The applicant immediately gets the host
portal (dashboard in "pending verification" state, event *drafting*), which keeps them engaged while
the queue turns around. The trust gate moves to **publishing**: an unapproved chef can never publish
an event ([events.md](./events.md) §publish gate) and never appears in discovery. Rationale: identical
safety posture (guests can only ever see approved chefs), much better applicant UX.

**Pending** — dashboard shows the verification banner ("Your application is being reviewed"); event
builder usable for drafts only.

**Rejected** (actioned in Phase 8, but the state is reachable via seed/tests now) — dashboard shows
the rejection notes; host may edit and **resubmit**: new `chef_verifications` rows are appended
(history preserved), profile `verification_status` returns to `pending`.

**Approved** (Phase 8 action) — publish gate opens; badges granted (`id_document` → "ID verified",
`food_safety_cert` → "Food-safety certified").

## 4. Backend API requirements

All under the existing RBAC matrix; zod-validated; standard error envelope.

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /api/host/onboarding` | authenticated, role `guest` (a `host` re-submitting uses PUT below) | The submit transaction from §3. 201 → `{ profile, verifications }`. Errors: 409 `VALIDATION_ERROR` (slug taken — suggest alternative), 409 `INVALID_BOOKING_STATE`-style conflict if a profile already exists (use a new `ALREADY_A_HOST` code? No — reuse 409 `EMAIL_TAKEN` pattern with new code `PROFILE_EXISTS`). |
| `GET /api/host/onboarding` | host, admin | Current profile + verification rows + status (drives wizard prefill & the pending/rejected banners). |
| `PUT /api/host/onboarding` | host, admin | Edit profile fields; if status is `rejected`, appends fresh verification rows and resets profile status to `pending`. Never touches `is_superhost` or `verification_status` directly from client input. |
| `GET /api/host/onboarding/slug-check?slug=` | authenticated | `{ available: boolean, suggestion?: string }` for the wizard. |

New error code: `PROFILE_EXISTS` (409) added to `ErrorCode`.
Role upgrade happens server-side inside the onboarding transaction — **the client never supplies a
role** (Never Generate rule). The fresh JWT keeps the old role until refresh; the proxy must refresh
tokens after onboarding submit so `/host/**` opens immediately.

## 5. Database / model requirements

No schema changes. Service-level rules:
- `slug`: `^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$`, unique (DB constraint is the backstop).
- Required at submit: cuisine, city, tagline (≤ 80 chars), bio (40–2000 chars), one `id_document`
  verification row, food-safety declaration.
- `UserRepository` gains `updateRole(userId, role, db)` (identity module, transaction-passthrough).
- `ChefRepository` gains `updateProfile`, `addVerification`, `listVerifications`,
  `setVerificationStatus(profile)` — interface-first, repos only.

## 6. Frontend page / component requirements

- `/host/onboarding` — multi-step wizard (client component over a server shell): stepper header,
  per-step validation, review-and-submit step. Composes existing atoms/molecules (Input, Button,
  Chip, Badge, Avatar); **no new design primitives needed**; any new molecule (e.g. `WizardSteps`)
  joins the design-system inventory.
- The `(app)/host/layout.tsx` guard currently bounces `guest` → `/403`; onboarding must be reachable
  by guests. **Decision:** move `/host/onboarding` out of the role-gated group (own layout requiring
  only authentication) — the backend still enforces who may submit.
- Host dashboard (specced in [events.md](./events.md) §6) renders the pending/rejected banner from
  `GET /api/host/onboarding`.

## 7. Permissions / RBAC rules

| Action | guest | host (pending) | host (approved) | admin |
|---|---|---|---|---|
| Open wizard / submit application | ✅ | resubmit only | — | ✅ (on behalf, rare) |
| Host dashboard / drafts | ❌ (403 from API; UI redirects to onboarding) | ✅ | ✅ | ✅ |
| Publish events | ❌ | ❌ (`VERIFICATION_REQUIRED` 403, see events.md) | ✅ | ✅ |
| Approve/reject verification | ❌ | ❌ | ❌ | Phase 8 |

Server-side enforcement only; the frontend redirects are UX sugar (existing rule).

## 8. Edge states

- **Slug taken** → inline error + suggestion, no step reset.
- **Already a host** → wizard redirects to dashboard; API 409 `PROFILE_EXISTS`.
- **Rejected** → dashboard banner with admin notes (notes exist in schema; written Phase 8) + "edit
  & resubmit" CTA.
- **Suspended user** (`is_suspended`) → onboarding API 403 `ACCOUNT_SUSPENDED` (existing code).
- Abandoned mid-wizard → client-side state only; nothing persisted until submit (no draft rows).

## 9. Test plan

Integration (`modules/chef-onboarding/__tests__/`):
1. Submit happy path: profile + 2 verification rows created, role flipped to `host`, status `pending` — all in one transaction (failure injection rolls back the role flip too).
2. Slug conflict → 409, nothing persisted.
3. Double application → 409 `PROFILE_EXISTS`.
4. Guest hitting `GET /api/host/onboarding` → 403; host gets own data only.
5. Resubmission after seeded `rejected`: appends rows, resets status to `pending`, history intact.
6. Client-supplied `role`/`verification_status`/`is_superhost` in the payload is ignored/rejected.
7. Unapproved host cannot publish (cross-test with events.md suite).

## 10. Open questions before implementation

1. **KYC document storage.** No file-storage infra exists (no S3/blob store). Proposed: Phase 7
   stores declared metadata + an opaque `document_ref` placeholder (schema already assumes this — "no
   raw PII in DB"); real upload infra is its own decision (likely out of university scope — confirm).
   *(Resolved at Phase 7 implementation: metadata-only, approved.)*
2. **Token refresh after role upgrade.** Proposed: onboarding submit response triggers the existing
   refresh flow in the proxy so the new `host` role lands in the JWT immediately. Confirm acceptable
   vs. forcing re-login. *(Resolved at Phase 7 implementation: auto-refresh, approved.)*
3. **Auto-approve for demo?** For presentations a seeded admin can approve (Phase 8), or seeds can
   create pre-approved chefs (already true). Default: no auto-approval path in production code.

---

## 11. Phase 8 — the admin verification queue (authored at Phase 8 spec time)

> The admin half of the state machine this spec deferred. Shared admin shell/RBAC/test plan live in
> [admin.md](./admin.md); this section owns the domain rules. **Status: ✅ implemented (Phase 8)** —
> `/admin/verifications` + the three endpoints below; tested in `modules/admin/__tests__/`.

**Queue contract** — `GET /api/admin/verifications`: every chef profile with
`verification_status = 'pending'`, **oldest application first** (fairness), joined with user display
fields and the full `chef_verifications` history (resubmissions visible as multiple rows).

**Approve** — `POST /api/admin/verifications/:chefId/approve`, one transaction:
1. `chef_profiles.verification_status → 'approved'`.
2. Latest pending `chef_verifications` rows → `approved`, stamped `reviewed_by = admin id`,
   `reviewed_at = now()`.
3. **Badges granted** from submitted kinds: `id_document` → "ID verified", `food_safety_cert` →
   "Food-safety certified" (idempotent inserts — the unique `(chef_id, label)` guard backstops).
4. Effect downstream: the events publish gate (events.md §4) opens — no further wiring needed.

**Reject** — `POST /api/admin/verifications/:chefId/reject` with **required** `notes` (4–500 chars):
status → `rejected`, latest pending rows stamped `rejected` + `reviewed_by/at`, notes stored on the
rows. The host sees the notes in their dashboard banner (already built, Phase 7) and may resubmit —
which appends fresh rows, resets the profile to `pending`, and re-enters this queue (already built).

**State machine (profile level):** `pending → approved | rejected`; `rejected → pending` (host
resubmit only); `approved` is terminal in this product (revocation = suspension, an account-level
action in admin.md). Both admin actions are **idempotent**: actioning an already-actioned
application returns 200 with current state (two admins racing = second is a no-op).

**Out of scope (future):** document expiry, re-verification campaigns, partial approvals per
document kind (the profile-level status is the product truth; per-row statuses are audit detail).
