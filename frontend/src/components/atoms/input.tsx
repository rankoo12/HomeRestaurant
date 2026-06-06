import { useId } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const fieldClasses =
  'h-12 w-full rounded-sm border border-line bg-bg-2 px-[15px] text-[14.5px] text-text transition-colors placeholder:text-text-3 focus:border-gold-line focus:bg-surface focus:outline-none';

export interface InputProps
  extends FieldProps,
    React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-[7px]">
      {label && (
        <label htmlFor={inputId} className="text-[12.5px] font-semibold tracking-[0.02em] text-text-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(fieldClasses, error && 'border-terra', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-xs text-text-3">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-err`} role="alert" className="text-[13px] text-terra">
          {error}
        </span>
      )}
    </div>
  );
}
