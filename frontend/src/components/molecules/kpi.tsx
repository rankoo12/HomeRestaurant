import { cn } from '@/lib/cn';
import { Icon } from '@/components/atoms';
import type { IconName } from '@/components/atoms';

export interface KpiProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: IconName;
  accent?: boolean;
}

/** Dashboard metric tile (host dashboard). */
export function Kpi({ label, value, sub, icon, accent = false }: KpiProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-[22px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-3">{label}</span>
        <div
          className={cn(
            'flex h-[34px] w-[34px] items-center justify-center rounded-[10px]',
            accent ? 'bg-gold-soft text-gold-2' : 'bg-surface-2 text-text-2',
          )}
        >
          <Icon name={icon} size={17} />
        </div>
      </div>
      <span className="font-serif text-[32px] leading-none">{value}</span>
      {sub && <span className="flex items-center gap-1.5 text-[12.5px] text-sage">{sub}</span>}
    </div>
  );
}
