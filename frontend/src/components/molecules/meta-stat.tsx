import { Icon } from '@/components/atoms';
import type { IconName } from '@/components/atoms';

export interface MetaStatProps {
  icon: IconName;
  label: string;
  value: string;
}

/** Icon + label/value stat, used in the event detail meta grid. */
export function MetaStat({ icon, label, value }: MetaStatProps) {
  return (
    <div className="flex items-center gap-[11px]">
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-surface-2 text-gold">
        <Icon name={icon} size={19} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-text-3">{label}</span>
        <span className="text-[14.5px] font-semibold">{value}</span>
      </div>
    </div>
  );
}
