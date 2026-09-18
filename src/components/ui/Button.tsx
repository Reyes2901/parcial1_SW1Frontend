import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
}

const variantClasses = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-foreground-inverse)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-background-hover)]',
  ghost: 'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-primary-muted)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 active:opacity-80',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-[var(--radius-control)]',
  md: 'px-4 py-2 text-sm rounded-[var(--radius-control)]',
  lg: 'px-6 py-3 text-base rounded-[var(--radius-control)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-medium transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-icon)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : leftIcon}
      {children}
    </button>
  );
});
