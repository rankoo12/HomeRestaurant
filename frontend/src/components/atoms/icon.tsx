/**
 * Monoline icon set, ported from docs/design/app/shared.jsx. Decorative by
 * default (aria-hidden); pass `title` to give it an accessible label.
 */
export const ICON_PATHS = {
  search: 'M11 4a7 7 0 1 0 4.95 11.95l4.55 4.55M11 4a7 7 0 0 1 4.95 11.95',
  star: 'M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77 6.8 19.5l.99-5.79-4.21-4.1 5.82-.85z',
  pin: 'M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  users:
    'M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.38M15.5 5.2a3 3 0 0 1 0 5.6',
  check: 'M5 12.5l4.2 4.2L19 7',
  shield: 'M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3zM9 11.8l2 2 4-4',
  heart:
    'M12 20s-7-4.4-9.2-8.3C1.3 9 2.3 5.7 5.4 5.1 7.3 4.7 9 5.6 12 8.2c3-2.6 4.7-3.5 6.6-3.1 3.1.6 4.1 3.9 2.6 6.6C19 15.6 12 20 12 20z',
  cal: 'M4 7h16v13H4zM4 7l0-2h16v2M8 3v4M16 3v4M8 12h3M8 16h8',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevR: 'M9 5l7 7-7 7',
  chevL: 'M15 5l-7 7 7 7',
  chevD: 'M5 9l7 7 7-7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  sparkle:
    'M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5zM18.5 14l.8 2.4L21.5 17l-2.2.6-.8 2.4-.8-2.4L15.5 17l2.2-.6z',
  bell: 'M18 16V11a6 6 0 1 0-12 0v5l-2 2.5h16zM10 20a2 2 0 0 0 4 0',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 1 1 7 0v3',
  card: 'M3 7h18v11H3zM3 10.5h18',
  leaf: 'M5 19c0-8 6-13 14-13 0 9-5 14-14 14M5 19c2-4 5-6 9-7.5',
  flame:
    'M12 3c.5 3-1.5 4.5-3 6.5-2 2.6-1 6 .5 7.5-1-2 1.5-3.5 2.5-5 .8 1.2 1.5 1.5 2 3 1.5-1.2 2.5-3.5 1.5-6.5C18 8 13 7 12 3z',
  plate: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  wheat:
    'M12 4v17M12 8c-2-1-3.5-.5-4 1 2 .8 3 .5 4-1zm0 0c2-1 3.5-.5 4 1-2 .8-3 .5-4-1zm0 5c-2-1-3.5-.5-4 1 2 .8 3 .5 4-1zm0 0c2-1 3.5-.5 4 1-2 .8-3 .5-4-1z',
  fish: 'M3 12c3-4 7-5 10-5 4 0 7 2 8 5-1 3-4 5-8 5-3 0-7-1-10-5zm14-1.5h.01',
  pepper:
    'M14 7c0-2 1.5-3 3-3-.5 2 0 3-1 4 1.5 1 2 3 1 5-1.5 3-5 4-7 4-3 0-5-2-5-4 0-3 4-6 9-6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13',
  chart: 'M5 19V9M10 19V5M15 19v-7M20 19v-11',
  cam: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z',
  message: 'M4 5h16v11H9l-4 4V5z',
  back: 'M10 5l-7 7 7 7M3 12h18',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  filled?: boolean;
  className?: string;
  /** Accessible label; when set the icon is exposed to assistive tech. */
  title?: string;
}

export function Icon({ name, size = 20, stroke = 1.6, filled = false, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
