import { cn } from '@/lib/cn';

export interface SeatsMeterProps {
  left: number;
  total: number;
}

/** Seat-availability meter with an accessible text equivalent. */
export function SeatsMeter({ left, total }: SeatsMeterProps) {
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 0;
  const low = left <= 3;
  const label = low ? `Only ${left} seats left` : `${left} of ${total} open`;

  return (
    <div className="flex min-w-[120px] flex-col gap-1.5">
      <div className="flex justify-between text-[12.5px] font-semibold">
        <span className={low ? 'text-terra' : 'text-text-2'}>{label}</span>
      </div>
      <div
        className="h-[5px] overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-valuenow={left}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full',
            low
              ? 'bg-[linear-gradient(90deg,var(--terra),#e07a4f)]'
              : 'bg-[linear-gradient(90deg,var(--gold),var(--gold-2))]',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
