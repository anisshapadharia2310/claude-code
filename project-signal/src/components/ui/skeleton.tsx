import { cn } from '@/lib/utils';

/**
 * Loading placeholders.
 *
 * Shaped like the content they stand in for, so the layout does not jump when
 * the real data arrives. The shimmer stops entirely under reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3', index === lines - 1 && 'w-3/5')} />
      ))}
    </div>
  );
}

export function SkeletonStatRow({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-xs">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className, lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface shadow-xs', className)} aria-hidden="true">
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-2 h-2.5 w-64" />
      </div>
      <div className="px-5 py-4">
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs" aria-hidden="true">
      <div className="flex gap-4 border-b border-line bg-surface-sunk px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0">
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton key={column} className={cn('h-3 flex-1', column === 0 && 'max-w-16')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Announces to assistive technology that a region is loading. */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
