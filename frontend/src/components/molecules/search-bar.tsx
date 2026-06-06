import { cn } from '@/lib/cn';
import { Icon } from '@/components/atoms';
import type { IconName } from '@/components/atoms';

export interface SearchBarProps {
  floating?: boolean;
}

const FIELDS: Array<{ icon: IconName; label: string; value: string }> = [
  { icon: 'pin', label: 'Where', value: 'Brooklyn, NY' },
  { icon: 'cal', label: 'When', value: 'This week' },
  { icon: 'users', label: 'Seats', value: '2 guests' },
];

/**
 * Pill search bar. Presentational for Phase 4 (sample field values); discovery
 * wiring is Phase 5.
 */
export function SearchBar({ floating = false }: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex w-full max-w-[680px] items-center gap-0.5 rounded-full border border-line-strong bg-surface p-1.5',
        floating ? 'shadow-pop' : 'shadow-soft',
      )}
    >
      {FIELDS.map((f, i) => (
        <div key={f.label} className="flex flex-1 items-center">
          <button
            type="button"
            className="flex flex-1 items-center gap-[11px] rounded-full px-[18px] py-[9px] text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
          >
            <Icon name={f.icon} size={18} className="text-gold" />
            <span className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-3">
                {f.label}
              </span>
              <span className="text-[13.5px] font-semibold">{f.value}</span>
            </span>
          </button>
          {i < FIELDS.length - 1 && <span className="h-[30px] w-px bg-line" />}
        </div>
      ))}
      <button
        type="button"
        aria-label="Search"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-on-gold transition-colors hover:bg-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
      >
        <Icon name="search" size={19} />
      </button>
    </div>
  );
}
