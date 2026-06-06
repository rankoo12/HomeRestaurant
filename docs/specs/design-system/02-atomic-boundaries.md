# Atomic Boundaries

> What lives at each level, and the rules for how they compose. Mirrors the directory structure in
> `frontend/src/components/`.

## The levels

| Level | Definition | Examples |
|---|---|---|
| **atoms/** | Indivisible primitives. No domain knowledge; only presentational props. | Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input, Chip, Badge |
| **molecules/** | A small composition of atoms forming one reusable unit. May know a domain *shape* (e.g. an event card's fields) but not where data comes from. | FoodImage, SearchBar, EventCard, EventFeature, SeatsMeter, MetaStat, ReviewCard, KPI |
| **organisms/** | Larger sections composed of molecules/atoms; may own local UI state (open/closed, selected). | Nav, Footer, Hero, CategoryRow, FilterRail, BookingCard |
| **templates/** | Page-level layout scaffolds (slots, grids). No real data. | (existing) PlaceholderPage; page shells arrive with feature phases |

## Rules
1. **Compose upward only.** An atom never imports a molecule; a molecule never imports an organism.
2. **No data fetching anywhere in components.** They receive everything via props. Hooks/fetching live in
   `hooks/` and are wired by feature phases.
3. **Props in, events out.** Components are controlled where it matters (e.g. `Stepper` takes `value` +
   `onChange`); they don't reach into global state.
4. **One component per file**, named export, kebab-case filename, PascalCase component (e.g.
   `event-card.tsx` → `EventCard`). A per-level `index.ts` barrel re-exports for clean imports.
5. **Styling is Tailwind + tokens only** (see [01-tokens.md](./01-tokens.md)). No inline styles.
6. **A11y is part of the component**, not an afterthought (see [04-accessibility.md](./04-accessibility.md)).

## Import paths
Components are imported via the `@/components/...` alias, e.g.
`import { Button } from '@/components/atoms';`. The prototype in `docs/design/` is **never** imported.
