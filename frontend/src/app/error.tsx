'use client';

import Link from 'next/link';
import { Button } from '@/components/atoms';

/**
 * Root error boundary (Phase 8 — error-and-empty-states spec): an unexpected
 * server/render error gets a friendly retry page, never the framework default.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="grid min-h-[60vh] place-items-center px-8 py-20 text-center">
      <div className="flex max-w-[440px] flex-col items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">
          Something broke
        </span>
        <h1 className="font-serif text-[32px]">A pan hit the floor</h1>
        <p className="text-[15px] text-text-2">
          Something went wrong on our side. Try again — if it keeps happening, the kitchen has been
          notified.
        </p>
        <div className="mt-2 flex gap-3">
          <Button size="sm" onClick={reset}>
            Try again
          </Button>
          <Link href="/events">
            <Button variant="ghost" size="sm">
              Browse dinners
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
