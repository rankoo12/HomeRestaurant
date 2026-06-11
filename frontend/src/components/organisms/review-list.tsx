'use client';

import { useState } from 'react';
import { ReviewCard } from '@/components/molecules';
import { cn } from '@/lib/cn';
import type { ReviewModel } from '@/components/types';

/**
 * Client review list with the report affordance (reviews spec §3/§6).
 * Flagging is a signal — the review stays visible (moderation is Phase 8).
 * Anonymous visitors get a login hint instead of a silent failure.
 */
export function ReviewList({
  reviews,
  columns = 2,
}: {
  reviews: ReviewModel[];
  columns?: 1 | 2;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function report(reviewId: string) {
    if (!window.confirm('Report this review to the Home Restaurant team?')) return;
    try {
      const res = await fetch(`/api/proxy/reviews/${reviewId}/flag`, { method: 'POST' });
      if (res.status === 401) {
        setNotice('Please log in to report a review.');
        return;
      }
      setNotice(res.ok ? 'Thanks — our team will take a look.' : 'Could not report — try again.');
    } catch {
      setNotice('Could not report — try again.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {notice && (
        <p role="status" className="text-[12.5px] text-text-3">
          {notice}
        </p>
      )}
      <div className={cn('grid gap-[18px]', columns === 2 ? 'md:grid-cols-2' : '')}>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} onReport={() => report(review.id)} />
        ))}
      </div>
    </div>
  );
}
