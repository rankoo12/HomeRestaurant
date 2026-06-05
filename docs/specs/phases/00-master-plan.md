# Master Plan — Phased Delivery

> **The build roadmap.** The app is delivered in **8 sequential phases**. Each phase ends with something
> demonstrable and leaves `main`-mergeable. We are spec-driven (SDD): **a phase cannot start until every
> spec it depends on exists and is read.** Each phase below lists the spec files it requires — those specs
> are authored (or finalized) at the start of the phase, not during coding.

## How phases work

- **One branch per phase**, named `phase-N-<slug>` (e.g. `phase-1-foundation`), branched from `main`.
- A phase is **done** when: its required specs are written, the code matches them, tests pass, `typecheck` + `lint` are clean, and the phase's acceptance checklist is met.
- Phases are **sequential** — each builds on the previous. Don't start N+1 until N is merged.
- Required-spec filenames below live in `docs/specs/` (cross-cutting) or `docs/specs/phases/` (phase notes). Planned specs are tracked in [`../00-index.md`](../00-index.md).

---

## Phase overview

| # | Phase | Goal (demoable outcome) | Branch |
|---|---|---|---|
| 0 | Skeleton & Planning | Folder skeleton, CLAUDE.md, this plan. *(done on `main`)* | `main` |
| 1 | Foundation & Tooling | Both apps boot; DB + Redis up; CI lint/typecheck green; empty pages render under the shell. | `phase-1-foundation` |
| 2 | Database & Domain Model | Full schema migrated; seed data; typed domain entities + repositories. | `phase-2-data` |
| 3 | Identity & RBAC | Sign up / log in / log out; JWT sessions; guest/host/admin route guards; 403 handling. | `phase-3-identity` |
| 4 | Design System | Atomic component library (atoms→organisms) + tokens + theme toggle, matching `docs/design`. | `phase-4-design-system` |
| 5 | Discovery & Profiles | Landing, `/events` discovery+filters, event details, chef profiles — read-only, real data. | `phase-5-discovery` |
| 6 | Booking & Payments | Concurrency-safe booking, Stripe checkout, confirmation, overbooking + payment-failed states. | `phase-6-booking` |
| 7 | Host & Reviews | Host onboarding (KYC), host dashboard, event builder, guest roster, earnings, reviews. | `phase-7-host` |
| 8 | Admin, Edge States & Hardening | Admin verification/users/moderation, all error pages, empty states, polish, deploy. | `phase-8-admin` |

---

## Phase 1 — Foundation & Tooling
**Goal:** Both workspaces install, boot, and pass lint/typecheck. Postgres + Redis run in Docker. Every
route from the page spec renders an empty placeholder under the correct shell. No business logic yet.

**Requires specs:**
- [`./01-foundation.md`](./01-foundation.md)
- [`../tooling-and-conventions.md`](../00-index.md) *(linting, tsconfig, scripts, commit conventions)*

**Acceptance:** `npm run dev` works in both apps · `docker-compose up` brings up Postgres+Redis · `typecheck` + `lint` clean · every spec route returns a placeholder page · health-check endpoint responds.

---

## Phase 2 — Database & Domain Model
**Goal:** The relational schema is designed, migrated, and seeded. Domain entities and repository
interfaces exist and are typed. No HTTP surface yet beyond what's needed to prove the DB layer.

**Requires specs:**
- [`./02-data.md`](./02-data.md)
- [`../database-schema.md`](../00-index.md) *(ERD: Users, Chefs, Events, Bookings, Reviews, Verifications, Payments, Payouts)*

**Acceptance:** migrations run forward cleanly · seed populates demo chefs/events mirroring `docs/design` data · repository unit tests pass · schema enforces the constraints booking depends on (capacity, unique seat holds).

---

## Phase 3 — Identity & RBAC
**Goal:** Real authentication and authorization. Users register and log in; sessions issued via JWT;
the three roles are enforced server-side; unauthorized access yields 403.

**Requires specs:**
- [`./03-identity.md`](./03-identity.md)
- [`../identity-and-rbac.md`](../00-index.md) *(auth flows, token lifecycle, role model, route-guard matrix)*

**Acceptance:** signup/login/logout end-to-end · passwords hashed · JWT issued + verified · guest blocked from `/host` & `/admin` (403) · `GET /api/users/me` works · auth middleware unit-tested.

---

## Phase 4 — Design System
**Goal:** The reusable Atomic Design component library, faithful to `docs/design`. Tokens, theme toggle
(Warm/Dark), and all shared primitives — so feature phases compose, never restyle.

**Requires specs:**
- [`./04-design-system.md`](./04-design-system.md)
- [`../design-system.md`](../00-index.md) *(token list, component inventory, atomic boundaries, a11y rules)*

**Acceptance:** atoms (Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input) + molecules (SearchBar, EventCard, SeatsMeter, MetaStat, ReviewCard) + organisms (Nav, Footer, Hero) built · tokens drive all color/type · theme toggle works · a component preview page renders the library.

---

## Phase 5 — Discovery & Profiles
**Goal:** The public, read-only discovery experience on real data: landing page (both home variants),
`/events` discovery grid with filters, event details, and chef profiles.

**Requires specs:**
- [`./05-discovery.md`](./05-discovery.md)
- [`../events.md`](../00-index.md) *(event read model, listing/filter/search API)*
- [`../reviews-and-moderation.md`](../00-index.md) *(review read model for profile aggregation — read side only)*

**Acceptance:** landing renders real featured events/chefs · `/events` filters by cuisine/price/dietary/date · event detail shows menu/meta/reviews/booking widget (no purchase yet) · chef profile aggregates rating + upcoming events · empty-state for no results.

---

## Phase 6 — Booking & Payments
**Goal:** The critical path. Concurrency-safe seat booking inside a DB transaction, Stripe checkout,
confirmation, and graceful handling of overbooking and payment failure.

**Requires specs:**
- [`./06-booking.md`](./06-booking.md)
- [`../booking-and-concurrency.md`](../00-index.md) *(transactional allocation, seat-hold model, overbooking abort)*
- [`../payments.md`](../00-index.md) *(Stripe checkout, webhooks, refunds, failure states)*

**Acceptance:** booking allocates seats under `SELECT … FOR UPDATE` · concurrent double-book is impossible (tested) · Stripe charges only on confirmed seat · **Overbooking State** aborts + suggests alternatives · **Payment Failed** keeps inputs · confirmation page + email · seat cache stays consistent with DB.

---

## Phase 7 — Host & Reviews
**Goal:** The host portal and the review loop. Onboarding with KYC submission, host dashboard, event
builder (CRUD), guest roster, earnings/payouts, and post-event guest reviews.

**Requires specs:**
- [`./07-host.md`](./07-host.md)
- [`../chef-onboarding-and-verification.md`](../00-index.md) *(onboarding wizard, KYC submission, verification queue states)*
- [`../events.md`](../00-index.md) *(event write model / builder — depended on, finalized here if not in P5)*
- [`../payments.md`](../00-index.md) *(host payouts / Stripe Connect side)*
- [`../reviews-and-moderation.md`](../00-index.md) *(review submission — write side)*

**Acceptance:** host completes onboarding → enters verification queue · host CRUDs events (publish/unpublish/duplicate) · event builder validates capacity/pricing/schedule · guest roster shows dietary + payment status · earnings dashboard reads real payouts · guest submits review after an attended event.

---

## Phase 8 — Admin, Edge States & Hardening
**Goal:** Close the loop with the admin portal, finish every edge/error state, and harden for delivery.

**Requires specs:**
- [`./08-admin.md`](./08-admin.md)
- [`../identity-and-rbac.md`](../00-index.md) *(admin role powers: suspend, role change)*
- [`../chef-onboarding-and-verification.md`](../00-index.md) *(admin approve/reject KYC)*
- [`../reviews-and-moderation.md`](../00-index.md) *(moderation actions)*
- [`./error-and-empty-states.md`](./error-and-empty-states.md) *(404, 403, overbooking, payment-failed, empty states)*

**Acceptance:** admin dashboard metrics · verification queue approve/reject flips chef state · user management (suspend/role change) · content moderation · all 5 edge cases from the page spec handled · final lint/typecheck/test green · deploy notes written.

---

## Dependency graph (build order rationale)

```
P1 Foundation
  └─ P2 Data ── P3 Identity
                   └─ P4 Design System (parallelizable with P3, but merged after)
                        └─ P5 Discovery
                             └─ P6 Booking & Payments
                                  └─ P7 Host & Reviews
                                       └─ P8 Admin & Hardening
```

Data underpins everything. Identity gates host/admin work. The design system precedes feature UI so
screens compose instead of restyle. Booking is isolated as its own phase because it is the highest-risk
correctness work in the system.
