import Link from 'next/link';
import { Button } from '@/components/atoms';

/** Branded 404 (Phase 8 — error-and-empty-states spec): quick links back to the food. */
export default function NotFound() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-8 py-20 text-center">
      <div className="flex max-w-[440px] flex-col items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">404</span>
        <h1 className="font-serif text-[32px]">This table doesn&apos;t exist</h1>
        <p className="text-[15px] text-text-2">
          The page you&apos;re after may have been moved, unpublished, or never set. The dinners,
          however, are very real.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/events">
            <Button size="sm">Browse dinners</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Back home
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
