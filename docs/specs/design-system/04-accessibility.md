# Accessibility Requirements

> Baseline a11y every component meets. Trust & safety is the product's edge — usable, accessible UI is part
> of that, not a nice-to-have.

## Across the board
- **Semantic elements:** real `<button>` for actions, `<a>`/`Link` for navigation, `<label>` tied to
  inputs, headings in order. Don't fake controls with `<div onClick>`.
- **Keyboard:** every interactive element is focusable and operable by keyboard; visible focus state
  (Tailwind `focus-visible` ring using `--gold-line`). No positive `tabindex`.
- **Color is never the only signal:** e.g. "almost full" shows text + color, not color alone.
- **Contrast:** body/most text meets WCAG AA against its surface (the warm palette is tuned for this; dim
  `--text-3` is for non-essential meta only).

## Per-component notes
- **Icon:** decorative by default (`aria-hidden`); when an icon is the only content of a control, the
  control needs an `aria-label`.
- **Button:** forwards `disabled`, `type`; spinner/label change announced via text, not just style.
- **Input:** always has an associated `<label>`; error text linked via `aria-describedby`; invalid state
  sets `aria-invalid`.
- **Stepper:** the +/- are buttons with `aria-label` ("Add a seat" / "Remove a seat"); the value is
  readable text; respects `min`/`max` (disabled at bounds).
- **Stars:** conveys the numeric rating via `aria-label` (e.g. "4.9 out of 5"), not just filled glyphs.
- **Avatar / FoodImage:** decorative gradients are `aria-hidden`; if they convey meaning, provide alt text
  via prop.
- **Nav:** `<nav>` landmark; the theme toggle is a labeled button reflecting state (`aria-pressed`).
- **SeatsMeter:** the meter has an accessible text equivalent ("3 of 10 seats open").

## Theme
- The Warm/Dark toggle sets `data-theme` and persists it; respects `prefers-color-scheme` for the initial
  value when nothing is stored.
