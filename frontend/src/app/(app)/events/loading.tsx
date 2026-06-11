import { Skeleton } from '@/components/atoms';

/** Discovery-grid skeleton (Phase 8 — error-and-empty-states spec): mirrors the card grid. */
export default function EventsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
              <Skeleton className="h-44 w-full rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
