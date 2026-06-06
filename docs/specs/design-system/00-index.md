# Design System — Spec Tree

> The component-library specs for **Phase 4**. The goal: a faithful, reusable Atomic Design library ported
> from the `docs/design/app/` prototype, so every later phase **composes** components instead of restyling.
> Read this index first, then the per-area files.

## Map

| Spec | Covers |
|---|---|
| [01-tokens.md](./01-tokens.md) | The design tokens (Warm + Dark) and how they map into the Tailwind theme. |
| [02-atomic-boundaries.md](./02-atomic-boundaries.md) | What counts as atom / molecule / organism / template, and the import rules. |
| [03-component-inventory.md](./03-component-inventory.md) | Every component to build, with its props and prototype source. |
| [04-accessibility.md](./04-accessibility.md) | A11y requirements every component meets. |

## Locked decisions
- **Styling:** **pure Tailwind utilities** referencing the token theme (`bg-surface`, `text-gold`,
  `rounded-lg`). **No inline styles, no hardcoded colors, no custom CSS component classes** — the only
  custom CSS is the token definitions, base element rules, and keyframes in `globals.css`.
- **Visual source of truth:** `docs/design/app/` (`shared.jsx`, `screens-*.jsx`, `styles.css`) + the
  screenshots in `docs/design/screenshots/`. **Read-only — never imported.**
- **Theme:** Warm (default) + Dark, toggled by `data-theme` on `<html>`, persisted to `localStorage`.
- **No data wiring:** components take props only. Hooking them to the API/routes is the feature phases'
  job. A `/dev/components` page renders the library with sample props.
- **Icons:** the prototype's monoline icon set is ported as an `Icon` atom with a typed `name` union.

## Scope (from the phase spec)
- **Atoms:** Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input, Chip, Badge.
- **Molecules:** FoodImage, SearchBar, EventCard, EventFeature, SeatsMeter, MetaStat, ReviewCard, KPI.
- **Organisms:** Nav, Footer, Hero, CategoryRow, FilterRail, BookingCard.
- Theme toggle + `/dev/components` preview page.
- Restyle the Phase-3 auth screens (`/login`, `/signup`, `/403`) with the new components (closes the
  inline-style debt recorded in Phase 3).

## Out of scope
- Wiring to real data/routes; building full screens (Phase 5+). The prototype's screen files are reference
  for how components compose, not something to port wholesale this phase.
