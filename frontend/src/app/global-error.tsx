'use client';

import './globals.css';

/**
 * Last-resort boundary (Phase 8 — error-and-empty-states spec): replaces the
 * root layout when even it fails, so it must render its own <html>/<body>.
 * Kept dependency-free — at this point nothing else can be trusted to render.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <section className="grid min-h-screen place-items-center px-8 py-20 text-center">
          <div className="flex max-w-[440px] flex-col items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-3">
              Something broke
            </span>
            <h1 className="font-serif text-[32px]">The kitchen went dark</h1>
            <p className="text-[15px] text-text-2">
              Something went wrong on our side. Reloading usually brings the lights back.
            </p>
            <button
              onClick={reset}
              className="mt-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-on-gold"
            >
              Try again
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
