import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Light render-assertion harness for the Phase 8 edge states
 * (docs/specs/phases/error-and-empty-states.md). The heavy contracts
 * (403/overbooking/payment-failed) are covered by the backend suites.
 */
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } }, // Next's tsconfig says "preserve"; vitest needs real JSX
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
