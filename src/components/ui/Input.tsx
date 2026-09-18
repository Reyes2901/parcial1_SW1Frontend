import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-foreground)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'px-3 py-2 text-sm bg-[var(--color-secondary)] border rounded-[var(--radius-control)]',
          'text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-faint)]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-icon)] focus:border-transparent',
          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--color-foreground-faint)]">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
});
