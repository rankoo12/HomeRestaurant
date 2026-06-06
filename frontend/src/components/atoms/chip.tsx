import { cn } from '@/lib/cn';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-[7px] whitespace-nowrap rounded-full border px-[15px] text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]',
        active
          ? 'border-gold-line bg-gold-soft text-gold-2'
          : 'border-line bg-surface text-text-2 hover:border-gold-line hover:text-text',
        className,
      )}
      {...props}
    />
  );
}
