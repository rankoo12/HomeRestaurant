import type { Config } from 'tailwindcss';

/**
 * Tailwind theme is driven by CSS variables defined in src/styles/tokens.css
 * (Warm default + Dark). Utilities reference the variables so a theme swap on
 * <html data-theme> re-themes everything. Full token spec: Phase 4.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-2': 'var(--bg-2)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        gold: 'var(--gold)',
        'gold-2': 'var(--gold-2)',
        terra: 'var(--terra)',
        wine: 'var(--wine)',
        sage: 'var(--sage)',
        'on-gold': 'var(--on-gold)',
      },
      fontFamily: {
        serif: 'var(--serif)',
        sans: 'var(--sans)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        pop: 'var(--shadow-pop)',
      },
    },
  },
  plugins: [],
};

export default config;
