/**
 * Warm duotone gradient palettes + glyphs, ported from docs/design/app/shared.jsx.
 * Used by Avatar and FoodImage to render deliberate editorial placeholders with
 * no external assets. These are generated visuals, so the gradient values live
 * here (not as theme tokens) — they're content, not chrome.
 */
import type { IconName } from './icon';

export const FOOD_GRADS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['#5a2110', '#9c3a18', '#dc6322', '#f3a445'], // jollof / tomato-saffron
  ['#4a2e0c', '#8a5a18', '#cf9a2c', '#f0c766'], // golden pasta / brodo
  ['#2a1107', '#6e2812', '#aa3f1c', '#d97a3b'], // mole / chili-cocoa
  ['#16271b', '#33502f', '#6f9450', '#aecb7e'], // kaiseki / herb-jade
  ['#2a0f1c', '#5e2236', '#9c3a56', '#cf6a82'], // plum / beet
  ['#3a2208', '#7a4d14', '#c5882a', '#edc069'], // bread / honey amber
  ['#16180c', '#3c4418', '#7d8f38', '#b8c266'], // pesto / olive
  ['#381407', '#8a3210', '#d96a22', '#f29a40'], // paprika / charred
];

export const FOOD_GLYPHS: readonly IconName[] = ['plate', 'leaf', 'flame', 'wheat', 'fish', 'pepper'];

export function gradAt(seed: number) {
  return FOOD_GRADS[seed % FOOD_GRADS.length]!;
}
