import Link from 'next/link';
import { Button } from '@/components/atoms';

/**
 * 403 Forbidden — shown when a user reaches an area their role can't access.
 * Final edge-state styling is consolidated in Phase 8.
 */
export default function ForbiddenPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-8 py-20 text-center">
      <div className="flex max-w-[420px] flex-col items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">403</span>
        <h1 className="font-serif text-[32px]">You don&apos;t have access</h1>
        <p className="text-[15px] text-text-2">
          This area is restricted. If you think you should have access, log in with the right account.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/login">
            <Button size="sm">Log in</Button>
          </Link>
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
