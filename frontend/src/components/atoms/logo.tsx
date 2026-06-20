import { cn } from '@/lib/cn';

export interface LogoProps {
  size?: number;
  mono?: boolean;
}

/** Brand wordmark — roofline + plate glyph beside the name. */
export function Logo({ size = 20, mono = false }: LogoProps) {
  const stroke = mono ? 'currentColor' : 'var(--gold)';
  const accent = mono ? 'currentColor' : 'var(--gold-2)';
  return (
    <div className="flex items-center gap-[10px]">
      <svg width={size + 8} height={size + 8} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M5 15 L16 5 L27 15"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="20" r="4.2" stroke={stroke} strokeWidth="2" />
        <path
          d="M16 14.5v1.4M16 24.1v1.4M11.8 20h-1.4M21.6 20h-1.4"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className={cn('font-serif italic leading-none tracking-[0.01em]', !mono && 'text-gold-2')} style={{ fontSize: size }}>
        Ratatouille
      </span>
    </div>
  );
}
