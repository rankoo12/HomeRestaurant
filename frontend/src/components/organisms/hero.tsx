import { FoodImage } from '@/components/molecules';

export interface HeroProps {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: string;
  imageSeed?: number;
  actions?: React.ReactNode;
  /** Optional element overlaid at the bottom (e.g. a floating SearchBar). */
  floating?: React.ReactNode;
}

/** Full-bleed landing hero over a food-image backdrop. */
export function Hero({ kicker, title, subtitle, imageSeed = 16, actions, floating }: HeroProps) {
  return (
    <section className="relative h-[560px] overflow-hidden">
      <div className="absolute inset-0">
        <FoodImage seed={imageSeed} glyph={false} vignette={false} />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(16,12,9,.5) 0%, rgba(16,12,9,.2) 35%, rgba(16,12,9,.92) 100%)',
        }}
      />
      <div className="relative mx-auto flex h-full max-w-[1240px] flex-col justify-end gap-5 px-8 pb-[120px] text-[#F6EFE2]">
        {kicker && (
          <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-[#F2BE72]">
            {kicker}
          </div>
        )}
        <h1 className="max-w-[780px] font-serif text-[62px] leading-[1.02] text-balance">{title}</h1>
        {subtitle && (
          <p className="max-w-[540px] text-[17px] leading-relaxed text-[rgba(246,239,226,0.84)]">
            {subtitle}
          </p>
        )}
        {actions && <div className="mt-1.5 flex flex-wrap gap-3.5">{actions}</div>}
      </div>
      {floating && (
        <div className="absolute inset-x-0 bottom-[-28px] mx-auto max-w-[1240px] px-8">{floating}</div>
      )}
    </section>
  );
}
