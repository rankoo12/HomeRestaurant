import { Icon } from './icon';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, min = 1, max = 99 }: StepperProps) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, next)));

  const btn = (dir: -1 | 1) => {
    const disabled = dir < 0 ? value <= min : value >= max;
    return (
      <button
        type="button"
        onClick={() => set(value + dir)}
        disabled={disabled}
        aria-label={dir < 0 ? 'Remove one' : 'Add one'}
        className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line-strong text-text transition-opacity disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
      >
        <Icon name={dir < 0 ? 'minus' : 'plus'} size={16} />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-[14px]">
      {btn(-1)}
      <span className="min-w-[22px] text-center font-serif text-xl tabular-nums" aria-live="polite">
        {value}
      </span>
      {btn(1)}
    </div>
  );
}
