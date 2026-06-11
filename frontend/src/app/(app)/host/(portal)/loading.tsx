import { Skeleton } from '@/components/atoms';

/** Host-portal skeleton (Phase 8 — error-and-empty-states spec): KPI row + list rows. */
export default function HostPortalLoading() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
      <div className="flex flex-col gap-7">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-[18px] sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
