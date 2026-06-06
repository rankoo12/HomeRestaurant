import { cn } from '@/lib/cn';

type Variant = 'gold' | 'ghost' | 'solid';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full border border-transparent font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]';

const variants: Record<Variant, string> = {
  gold: 'bg-gold text-on-gold hover:bg-gold-2',
  ghost: 'bg-transparent text-text border-line-strong hover:border-gold-line hover:text-gold-2',
  solid: 'bg-surface-2 text-text border-line hover:bg-surface-3',
};

const sizes: Record<Size, string> = {
  sm: 'h-[38px] px-4 text-[13px]',
  md: 'h-[46px] px-[22px] text-sm',
  lg: 'h-[54px] px-[30px] text-[15px]',
};

export function Button({
  variant = 'gold',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...props}
    />
  );
}
