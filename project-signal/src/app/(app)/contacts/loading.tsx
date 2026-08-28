import { LoadingRegion, Skeleton, SkeletonStatRow, SkeletonTable } from '@/components/ui/skeleton';

/** Loading state for the contact list: header, counts, filter bar, table. */
export default function ContactsLoading() {
  return (
    <LoadingRegion label="Loading contacts">
      <div className="mb-6">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="mt-3 h-6 w-40" />
        <Skeleton className="mt-3 h-3 w-full max-w-2xl" />
      </div>

      <div className="mb-5">
        <SkeletonStatRow />
      </div>

      <div className="mb-5 rounded-xl border border-line bg-surface p-4 shadow-xs" aria-hidden="true">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <SkeletonTable rows={10} columns={7} />
    </LoadingRegion>
  );
}
