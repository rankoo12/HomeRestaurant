'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Icon, Stars } from '@/components/atoms';
import { formatDateLabel } from '@/lib/mappers';

/**
 * The review form (reviews spec §6): interactive Stars + body with counter.
 * Eligibility errors from the backend (event not completed, already reviewed,
 * not attended) render as specific blocked states, not generic failures.
 */
export function ReviewForm({
  bookingId,
  bookingStatus,
  eventTitle,
  eventSlug,
  startsAt,
}: {
  bookingId: string;
  bookingStatus: string;
  eventTitle: string;
  eventSlug: string;
  startsAt: string;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(
    bookingStatus !== 'confirmed' ? 'Only attended dinners can be reviewed.' : null,
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId, rating, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        return;
      }
      if (data?.error?.code === 'REVIEW_NOT_ELIGIBLE' || data?.error?.code === 'ALREADY_REVIEWED') {
        setBlocked(data.error.message);
      } else {
        setError(data?.error?.message ?? 'Could not submit — please try again.');
      }
    } catch {
      setError('Could not submit — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
        <Icon name="star" size={28} className="text-gold" />
        <h1 className="font-serif text-3xl">Thank you!</h1>
        <p className="text-sm text-text-2">
          Your review is live on the event page and counts toward the chef&apos;s rating.
        </p>
        <Link href={`/events/${eventSlug}`}>
          <Button>Back to {eventTitle}</Button>
        </Link>
      </section>
    );
  }

  if (blocked) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
        <Icon name="clock" size={28} className="text-gold" />
        <h1 className="font-serif text-3xl">Not just yet</h1>
        <p className="max-w-[400px] text-sm text-text-2">
          {blocked} {blocked.includes('after') ? `The dinner is on ${formatDateLabel(startsAt)}.` : ''}
        </p>
        <Link href={`/events/${eventSlug}`}>
          <Button variant="ghost">View the dinner</Button>
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] leading-tight">How was dinner?</h1>
        <p className="text-sm text-text-2">
          {eventTitle} · {formatDateLabel(startsAt)}
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Your rating</span>
          <Stars value={rating} size={28} onChange={setRating} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Your review</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={2000}
            className="rounded-sm border border-line bg-bg-2 px-[15px] py-3 text-[14.5px] focus:border-gold-line focus:bg-surface focus:outline-none"
            placeholder="The food, the host, the table talk — what should the next guest know? (at least 10 characters)"
          />
          <span className="text-xs text-text-3">{body.length}/2000</span>
        </label>
      </section>

      <Button block size="lg" onClick={submit} disabled={rating === 0 || body.trim().length < 10 || busy}>
        {busy ? 'Posting…' : 'Post review'}
      </Button>
      <p className="text-center text-xs text-text-3">
        Reviews can&apos;t be edited after posting — make it count.
      </p>
    </div>
  );
}
