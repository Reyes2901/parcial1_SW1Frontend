import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-[var(--color-icon)]">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-[var(--color-foreground)]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
