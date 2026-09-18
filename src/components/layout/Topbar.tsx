import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface TopbarProps {
  children?: ReactNode;
  className?: string;
}

export function Topbar({ children, className }: TopbarProps) {
  return (
    <header className={cn('h-14 flex items-center px-6 bg-[var(--color-secondary)] border-b border-[var(--color-border)] gap-4', className)}>
      {children}
    </header>
  );
}
