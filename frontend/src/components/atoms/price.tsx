import { cn } from '@/lib/cn';

export interface PriceProps {
  value: number;
  suffix?: string;
  big?: boolean;
}

export function Price({ value, suffix = '/ seat', big = false }: PriceProps) {
  return (
    <div className="flex items-baseline gap-[5px]">
      <span className={cn('font-serif leading-none', big ? 'text-[34px]' : 'text-[19px]')}>
        ${value}
      </span>
      <span className={cn('text-text-3', big ? 'text-sm' : 'text-[12.5px]')}>{suffix}</span>
    </div>
  );
}
