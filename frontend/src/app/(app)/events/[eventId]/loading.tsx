import { Skeleton } from '@/components/atoms';

/** Event-detail skeleton (Phase 8 — error-and-empty-states spec): hero + two-column body. */
export default function EventDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
      <div className="flex flex-col gap-7">
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
