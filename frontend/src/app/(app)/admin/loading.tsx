import { Skeleton } from '@/components/atoms';

/** Admin-portal skeleton (Phase 8 — error-and-empty-states spec): KPI grid + queue rows. */
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
      <div className="flex flex-col gap-7">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-[18px] sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
