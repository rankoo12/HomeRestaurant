# Design Tokens

> Ported from `docs/design/app/styles.css`. Already live in `frontend/src/styles/tokens.css` (added in
> Phase 1) and mapped into Tailwind in `tailwind.config.ts`. This spec is the reference for what each token
> means; the CSS file is the source of truth for values.

## Theming mechanism
- All tokens are CSS variables on `:root` (Warm) and `html[data-theme="dark"]` (Dark).
- Tailwind utilities reference the variables (e.g. `colors.surface = 'var(--surface)'`), so a single
  `data-theme` swap re-themes every component. Never hardcode a hex value in a component.

## Color tokens
| Token | Tailwind | Role |
|---|---|---|
| `--bg`, `--bg-2` | `bg`, `bg-2` | page surfaces (warm cream / oat) |
| `--surface`, `--surface-2`, `--surface-3` | `surface`, `surface-2`, `surface-3` | card/control surfaces |
| `--line`, `--line-strong` | `line`, `line-strong` | borders / dividers |
| `--text`, `--text-2`, `--text-3` | `text`, `text-2`, `text-3` | ink: primary / muted / dim |
| `--gold`, `--gold-2` | `gold`, `gold-2` | terracotta accent + hover |
| `--terra`, `--wine`, `--sage` | `terra`, `wine`, `sage` | secondary accents (alerts, wine, olive) |
| `--on-gold` | `on-gold` | text on gold fills |

Soft/line variants (`--gold-soft`, `--gold-line`, `--terra-soft`, `--sage-soft`) are referenced directly
as `var(--…)` in the few places they're needed (badges, focus rings).

## Radii / shadows / type
| Token | Tailwind | Value intent |
|---|---|---|
| `--r-sm`/`--r`/`--r-lg`/`--r-xl` | `rounded-sm`/`rounded`/`rounded-lg`/`rounded-xl` | 8 / 14 / 20 / 28 px |
| `--shadow-soft`, `--shadow-pop` | `shadow-soft`, `shadow-pop` | resting / elevated |
| `--serif` | `font-serif` | Bodoni Moda display |
| `--sans` | `font-sans` | Hanken Grotesk body |

## Fonts
The prototype uses Bodoni Moda (serif display) + Hanken Grotesk (sans). Phase 4 loads them via
`next/font` (Google) and binds them to the `--serif`/`--sans` variables so the tokens stay the single
reference. Fallbacks: Playfair Display / Georgia / serif; system-ui / sans-serif.

## Base layer (globals.css)
Allowed non-token CSS, ported from the prototype: body defaults, `::selection`, scrollbar styling, the
film-grain `body::before` texture, and the `screenIn` / `fadeUp` keyframes. Everything else is Tailwind.
