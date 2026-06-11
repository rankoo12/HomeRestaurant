import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

/**
 * Loading placeholder block (Phase 8 — error-and-empty-states spec). Size it
 * with utility classes to mirror the content it stands in for; screens compose
 * these into card/table-shaped layouts so nothing renders as a spinner-only page.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
    />
  );
}
