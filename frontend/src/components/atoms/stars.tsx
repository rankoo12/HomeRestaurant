import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface StarsProps {
  value: number;
  size?: number;
  className?: string;
}

/** Five-star rating display. Conveys the numeric value to assistive tech. */
export function Stars({ value, size = 14, className }: StarsProps) {
  const rounded = Math.round(value);
  return (
    <span
      className={cn('inline-flex gap-0.5', className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          stroke={1.4}
          filled={i <= rounded}
          className={i <= rounded ? 'text-gold' : 'text-text-3'}
        />
      ))}
    </span>
  );
}
