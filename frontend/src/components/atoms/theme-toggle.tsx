'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icon';

type Theme = 'light' | 'dark';

/**
 * Warm/Dark toggle. Reads the theme set pre-paint by ThemeScript, flips
 * html[data-theme], and persists the choice. Labeled + aria-pressed.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('hr-theme', next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setTheme(next);
  }

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to warm theme' : 'Switch to dark theme'}
      className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-text-2 transition-colors hover:border-gold-line hover:text-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
    >
      <Icon name={dark ? 'flame' : 'sparkle'} size={17} />
    </button>
  );
}
