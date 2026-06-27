import { cn } from '@/lib/cn';
import { gradAt } from './food-grads';

export interface AvatarProps {
  seed?: number;
  name?: string;
  size?: number;
  ring?: boolean;
  /** Real portrait (e.g. a chef photo). When set, shown instead of initials. */
  src?: string | null;
}

/**
 * Avatar — a real portrait when `src` is provided, otherwise initials over a
 * per-seed warm gradient. The gradient is dynamic content (one of infinite
 * seeds), so it uses an inline background; this is the documented exception to
 * the no-inline-styles rule (generated visuals, not theme chrome).
 * See docs/specs/design-system/01-tokens.md.
 */
export function Avatar({ seed = 0, name = '', size = 44, ring = false, src }: AvatarProps) {
  const g = gradAt(seed + 2);
  const ringCls = ring
    ? 'border-2 border-gold-line shadow-[0_0_0_3px_var(--gold-soft)]'
    : 'border border-white/15';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static/inline portrait, not a remote CMS asset
      <img
        src={src}
        alt={name || ''}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover', ringCls)}
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-serif', ringCls)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: g[3],
        background: `radial-gradient(circle at 36% 30%, ${g[2]}, ${g[1]} 55%, ${g[0]})`,
      }}
      aria-hidden={!name}
      aria-label={name || undefined}
    >
      {initials}
    </div>
  );
}
