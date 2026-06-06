# Phase 4 — Design System

**Branch:** `phase-4-design-system` · **Depends on:** Phase 1 (can develop alongside P3, merge after) · **Status:** ✅ Complete

## Objective
Build the Atomic Design component library and design tokens faithful to `docs/design`, so every feature
phase composes existing components instead of restyling.

## In scope
- Tokens ported from `docs/design/app/styles.css` (Warm + Dark) into Tailwind theme + CSS variables.
- **Atoms:** Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input, Chip, Badge.
- **Molecules:** SearchBar, EventCard, EventFeature, SeatsMeter, MetaStat, ReviewCard, KPI.
- **Organisms:** Nav, Footer, Hero, CategoryRow, FilterRail, BookingCard.
- Theme toggle (Warm/Dark) and a `/dev/components` preview page.

## Out of scope
- Wiring components to real data or routes (feature phases do that).

## Requires specs
- [`docs/specs/design-system/`](../design-system/00-index.md) *(✅ authored)* — the **design-system spec
  tree**: tokens, atomic boundaries + import rules, the full component inventory with props, and a11y
  requirements. Read `design-system/00-index.md` first.

## Acceptance checklist
- [x] All listed atoms/molecules/organisms implemented in `frontend/src/components/`. *(11 atoms inc. ThemeToggle, 8 molecules, 6 organisms — barrel-exported per level.)*
- [x] All visual styling derives from tokens — no hardcoded colors. *(Tailwind utilities map to the token theme; the only inline backgrounds are the per-seed generated gradients in Avatar/FoodImage — documented exception.)*
- [x] Warm/Dark toggle re-themes the whole library. *(ThemeToggle flips `data-theme`, persisted; ThemeScript prevents flash.)*
- [x] Preview page renders every component. *(`/dev/components`, both themes, interactive; renders without errors — verified via rendered HTML.)*
- [x] No inline styles in production components (except the documented generated-gradient exception).

## What shipped
- **Spec tree:** [`docs/specs/design-system/`](../design-system/00-index.md) (5 files).
- **Tokens/base:** fonts via `next/font` bound to `--serif`/`--sans`; ported keyframes, scrollbar, film-grain into `globals.css`; soft/line color variants added to the Tailwind theme.
- **Atoms** (`components/atoms/`): Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input, Chip, Badge, ThemeToggle (+ ThemeScript, food-grads).
- **Molecules** (`components/molecules/`): FoodImage, SeatsMeter, MetaStat, ReviewCard, Kpi, EventCard, EventFeature, SearchBar.
- **Organisms** (`components/organisms/`): Nav, Footer, Hero, CategoryRow, FilterRail, BookingCard.
- **Preview:** `/dev/components`. **Restyle:** `/login`, `/signup`, `/403` now use the components (closes the Phase-3 inline-style debt).
- View-model types in `components/types.ts` keep the library decoupled from backend entities.

## Notes
- **Pure Tailwind utilities** referencing the token theme — no custom CSS component classes. The single
  inline-style exception is the per-seed gradients in `Avatar`/`FoodImage` (infinite seeds can't be Tailwind
  classes; they're generated content, not chrome) — documented in `design-system/01-tokens.md`.
- **Visual sign-off pending a human eye:** the library renders without errors and uses the tokens, but a
  true pixel comparison to `docs/design/screenshots/` wasn't automated (no headless browser). Recommend a
  quick look at `/dev/components` in both themes.
- `/dev/components` is a dev-only preview; it can be removed or gated before production.
