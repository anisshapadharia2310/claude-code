import { LoadingRegion, Skeleton, SkeletonCard, SkeletonStatRow } from '@/components/ui/skeleton';

/**
 * The default loading state for every screen inside the shell.
 *
 * Shaped like the pages it stands in for — a header, a metric strip, then
 * content — so the layout does not jump when the data arrives.
 */
export default function AppLoading() {
  return (
    <LoadingRegion label="Loading">
      <div className="mb-6">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="mt-3 h-6 w-72" />
        <Skeleton className="mt-3 h-3 w-full max-w-xl" />
      </div>

      <div className="mb-6">
        <SkeletonStatRow />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </div>
    </LoadingRegion>
  );
}
