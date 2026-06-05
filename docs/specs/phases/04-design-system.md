# Phase 4 — Design System

**Branch:** `phase-4-design-system` · **Depends on:** Phase 1 (can develop alongside P3, merge after) · **Status:** 📝 Not started

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
- `docs/specs/design-system.md` *(to author this phase)* — token table, full component inventory with props, atomic-boundary rules (what counts as atom vs molecule vs organism), and accessibility requirements.

## Acceptance checklist
- [ ] All listed atoms/molecules/organisms implemented in `frontend/src/components/`.
- [ ] All visual styling derives from tokens — no hardcoded colors.
- [ ] Warm/Dark toggle re-themes the whole library.
- [ ] Preview page renders every component; matches `docs/design` screenshots.
- [ ] No inline styles in production components.
