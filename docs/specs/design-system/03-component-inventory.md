# Component Inventory

> Every component to build this phase, its props, and its prototype source in `docs/design/app/`.
> Props use TypeScript types; all are presentational (no data fetching).

## Atoms

| Component | Key props | Prototype source |
|---|---|---|
| `Icon` | `name: IconName` (typed union of the monoline set), `size?`, `stroke?`, `filled?`, `className?` | `shared.jsx` ICONS |
| `Logo` | `size?: number`, `mono?: boolean` | `shared.jsx` Logo |
| `Avatar` | `seed?: number`, `name?: string`, `size?: number`, `ring?: boolean` | `shared.jsx` Avatar |
| `Stars` | `value: number` (0–5), `size?: number` | `shared.jsx` Stars |
| `Price` | `value: number`, `suffix?: string`, `big?: boolean` | `shared.jsx` Price |
| `Stepper` | `value: number`, `onChange`, `min?`, `max?` | `shared.jsx` Stepper |
| `VerifiedPill` | — | `shared.jsx` VerifiedPill |
| `Button` | `variant?: 'gold'\|'ghost'\|'solid'`, `size?: 'sm'\|'md'\|'lg'`, `block?`, native button props | `styles.css` .btn* |
| `Input` | label/error wrapper + native input/textarea props | `styles.css` .field/.input |
| `Chip` | `active?: boolean`, button props | `styles.css` .chip |
| `Badge` | `tone: 'verified'\|'soon'\|'gold'`, children | `styles.css` .badge* |
| `Skeleton` | `className?` (sized by utilities; `aria-hidden` pulse block) | — *(added Phase 8 for loading states — error-and-empty-states spec)* |

`IconName` enumerates the prototype's icon keys (search, star, pin, clock, users, check, shield, heart,
cal, arrow, chev*, plus, minus, sparkle, bell, lock, card, leaf, flame, plate, wheat, fish, pepper, edit,
trash, chart, cam, globe, message, back).

## Molecules

| Component | Key props | Prototype source |
|---|---|---|
| `FoodImage` | `seed?: number`, `glyph?: boolean`, `vignette?: boolean`, `children?` | `shared.jsx` FoodImage |
| `SeatsMeter` | `left: number`, `total: number` | `shared.jsx` SeatsMeter |
| `MetaStat` | `icon: IconName`, `label: string`, `value: string` | `screens-event.jsx` MetaStat |
| `Stars`→ used in cards | — | — |
| `EventCard` | `event: EventCardModel`, `onOpen?`, `compact?` | `screens-browse.jsx` EventCard |
| `EventFeature` | `event: EventCardModel`, `onOpen?`, `reverse?` | `screens-browse.jsx` EventFeature |
| `ReviewCard` | `review: ReviewModel` | `screens-event.jsx` reviews |
| `KPI` | `label`, `value`, `sub?`, `icon`, `accent?` | `screens-host.jsx` KPI |
| `SearchBar` | `floating?`, `initialWhere?`, `initialDate?`, `initialSeats?`, `extraParams?` — interactive client component; submits to `/events?where&date&seats` *(wired post-Phase 8)* | `screens-browse.jsx` SearchBar |

> `EventCardModel` / `ReviewModel` are lightweight view-model props (title, chef name, price, seats, etc.)
> defined in `components` types — NOT the backend entities. Feature phases map API data → these models.

## Organisms

| Component | Key props / state | Prototype source |
|---|---|---|
| `Nav` | `user?` (for logged-in vs out), theme toggle | `shell.jsx` Nav |
| `Footer` | — | `shell.jsx` Footer |
| `Hero` | `title`, `kicker?`, `imageSeed?`, CTA slots | `screens-browse.jsx` HomeA hero |
| `CategoryRow` | `categories`, `active`, `onChange` | `screens-browse.jsx` CategoryRow |
| `FilterRail` | controlled filter state via props | `screens-browse.jsx` FilterRail |
| `BookingCard` | `event`, `seats`, `onSeatsChange`, totals | `screens-event.jsx` sticky booking |

## Preview
`/dev/components` renders one section per level showing each component with representative props, in both
Warm and Dark. Acceptance is a visual match to `docs/design/screenshots/`.
