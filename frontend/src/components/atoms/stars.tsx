import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface StarsProps {
  value: number;
  size?: number;
  className?: string;
  /**
   * Interactive mode (review form — reviews spec §6): renders five buttons
   * instead of a static image. Omit for the default display-only behavior.
   */
  onChange?: (value: number) => void;
}

/** Five-star rating display (or input, when `onChange` is given). */
export function Stars({ value, size = 14, className, onChange }: StarsProps) {
  const rounded = Math.round(value);

  if (onChange) {
    return (
      <span className={cn('inline-flex gap-0.5', className)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === rounded}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onClick={() => onChange(i)}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
          >
            <Icon
              name="star"
              size={size}
              stroke={1.4}
              filled={i <= rounded}
              className={i <= rounded ? 'text-gold' : 'text-text-3'}
            />
          </button>
        ))}
      </span>
    );
  }

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
