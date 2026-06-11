'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookingCard } from '@/components/organisms';
import { Icon } from '@/components/atoms';

interface AlternativeEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  seatsLeft: number;
}

/**
 * Booking widget — wired to the Phase 6 hold flow. "Reserve" creates a seat
 * hold + pending booking via the proxy and moves to /checkout/:bookingId.
 * A 409 surfaces the Overbooking state inline with same-chef alternatives
 * (docs/specs/booking-and-concurrency.md §8).
 */
export function BookingWidget({
  eventId,
  price,
  rating,
  seatsLeft,
  seatsTotal,
  dateLabel,
}: {
  eventId: string;
  price: number;
  rating: number;
  seatsLeft: number;
  seatsTotal: number;
  dateLabel: string;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState(Math.min(2, Math.max(1, seatsLeft)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeEvent[]>([]);

  async function reserve() {
    setBusy(true);
    setError(null);
    setAlternatives([]);
    try {
      const res = await fetch('/api/proxy/bookings/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId, seats }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/checkout/${data.booking.id}`);
        return;
      }
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (data?.error?.code === 'INSUFFICIENT_SEATS') {
        setError(data.error.message);
        setAlternatives((data.error.details?.alternatives ?? []) as AlternativeEvent[]);
        router.refresh(); // re-render with fresh seat counts
      } else {
        setError(data?.error?.message ?? 'Something went wrong — please try again.');
      }
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <BookingCard
        price={price}
        rating={rating}
        seatsLeft={seatsLeft}
        seatsTotal={seatsTotal}
        dateLabel={dateLabel}
        seats={seats}
        onSeatsChange={setSeats}
        onReserve={busy || seatsLeft === 0 ? undefined : reserve}
      />

      {seatsLeft === 0 && !error && (
        <p className="text-center text-xs text-text-3">This dinner is fully booked.</p>
      )}
      {busy && <p className="text-center text-xs text-text-3">Reserving your seats…</p>}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2.5 rounded-md border border-line bg-bg-2 p-3.5 text-[13px]"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="users" size={14} className="text-gold" /> {error}
          </span>
          {alternatives.length > 0 && (
            <>
              <span className="text-text-2">Other dinners by this chef:</span>
              <ul className="flex flex-col gap-1.5">
                {alternatives.map((a) => (
                  <li key={a.id}>
                    <Link href={`/events/${a.slug}`} className="text-gold underline-offset-2 hover:underline">
                      {a.title} · {a.seatsLeft} seats left
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
