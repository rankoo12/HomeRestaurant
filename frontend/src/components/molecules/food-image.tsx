import { gradAt, FOOD_GLYPHS } from '@/components/atoms';
import { ICON_PATHS } from '@/components/atoms';

export interface FoodImageProps {
  seed?: number;
  glyph?: boolean;
  vignette?: boolean;
  children?: React.ReactNode;
}

/**
 * Editorial food-photo placeholder — a per-seed warm duotone gradient with a
 * faint monoline glyph and vignette. Self-contained (no external images). The
 * gradient is dynamic generated content, so it uses inline backgrounds (the
 * documented exception to no-inline-styles). Fills its positioned parent.
 */
export function FoodImage({ seed = 0, glyph = true, vignette = true, children }: FoodImageProps) {
  const g = gradAt(seed);
  const gl = FOOD_GLYPHS[(seed * 3) % FOOD_GLYPHS.length]!;
  const ang = 120 + ((seed * 37) % 90);
  const cx = 38 + ((seed * 11) % 26);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `
          radial-gradient(48% 46% at 50% 46%, ${g[3]} 0%, ${g[2]} 40%, transparent 70%),
          radial-gradient(130% 100% at ${cx}% 16%, ${g[2]}44, transparent 54%),
          radial-gradient(120% 120% at 84% 108%, ${g[0]}, transparent 56%),
          linear-gradient(${ang}deg, ${g[0]} 0%, ${g[1]} 100%)`,
      }}
      aria-hidden="true"
    >
      {glyph && (
        <svg
          width="40%"
          height="40%"
          viewBox="0 0 24 24"
          fill="none"
          stroke={g[3]}
          strokeWidth="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
        >
          <path d={ICON_PATHS[gl]} />
        </svg>
      )}
      {vignette && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(130% 110% at 50% 30%, transparent 52%, rgba(0,0,0,.42))',
          }}
        />
      )}
      {children}
    </div>
  );
}
