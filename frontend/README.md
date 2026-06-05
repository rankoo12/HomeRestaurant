# Frontend — Home Restaurant Web

Next.js (App Router) + Tailwind + **Atomic Design**. Never imports from `backend/`; talks to the API
only through the proxy. See the root [`CLAUDE.md`](../CLAUDE.md) for the rules.

## Folder map

| Path | Purpose |
|---|---|
| `src/app/(public)/` | Unauthenticated pages: `/`, `/login`, `/signup`, `/trust-and-safety`, `/support`. |
| `src/app/(app)/` | Authenticated shell (Nav + Footer) wrapping guest / host / admin routes. |
| `src/app/api/proxy/` | The only channel to the backend. Attaches auth, forwards to Fastify. |
| `src/components/atoms/` | Smallest primitives: Icon, Logo, Avatar, Stars, Price, Stepper, VerifiedPill, Button, Input. |
| `src/components/molecules/` | Composed units: SearchBar, EventCard, SeatsMeter, MetaStat, ReviewCard, FilterRail. |
| `src/components/organisms/` | Page sections: Nav, Footer, Hero, EventFeature, BookingCard, CategoryRow. |
| `src/components/templates/` | Page-level layout scaffolds (shells, dashboard grids). |
| `src/hooks/` | Data-fetching + business-logic hooks (decoupled from UI). |
| `src/lib/` | API client, fetch wrappers, formatters. |
| `src/styles/` | Tailwind config + design tokens ported from `docs/design/app/styles.css`. |
| `src/types/` | Shared frontend types (mirror backend DTOs). |

## Atomic Design rule

Build **atoms → molecules → organisms → templates → pages**, in that order. A page never reaches past a
template to raw atoms ad-hoc; compose upward. The prototype in `docs/design/app/` is the visual reference —
**reference only, never imported.** No inline styles in production components; use Tailwind + tokens.
