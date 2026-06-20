'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/atoms';
import type { BookingViewDto } from '@/lib/api';
import { dollars } from '@/lib/mappers';

/**
 * Demo hosted-checkout UI. Looks like a payment page, but "Pay" simply tells the
 * backend to run the confirmation webhook (no Stripe, no charge). A banner makes
 * the demo nature explicit so it's never mistaken for a real payment surface.
 */
export function DemoPayClient({ view }: { view: BookingViewDto }) {
  const router = useRouter();
  const { booking, event } = view;
  const [busy, setBusy] = useState<'pay' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(outcome: 'succeeded' | 'failed') {
    setBusy(outcome === 'succeeded' ? 'pay' : 'decline');
    setError(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${booking.id}/demo-pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? 'Something went wrong.');
        return;
      }
      if (outcome === 'succeeded') {
        router.push(`/guest/bookings/${booking.id}?paid=1`);
      } else {
        router.push(`/checkout/${booking.id}?cancelled=1`);
      }
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg-2 px-6 py-12">
      <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-2 bg-gold-soft px-5 py-2.5 text-[12.5px] font-semibold text-gold-2">
          <Icon name="sparkle" size={14} /> Demo checkout — no real card is charged
        </div>

        <div className="flex flex-col gap-5 p-7">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-3">
              Pay Ratatouille
            </span>
            <span className="font-serif text-[34px] leading-none">
              ${dollars(booking.totalCents)}
            </span>
            <span className="text-[13px] text-text-2">
              {event.title} · {booking.seats} {booking.seats > 1 ? 'seats' : 'seat'}
            </span>
          </div>

          {/* Mock card field — visual only, never read. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-text-2">Card information</span>
            <div className="flex items-center gap-2 rounded-md border border-line bg-bg-2 px-3.5 py-3 text-sm text-text-3">
              <Icon name="card" size={16} className="text-text-3" />
              <span className="tabular-nums">4242 4242 4242 4242</span>
              <span className="ml-auto tabular-nums">12 / 34</span>
              <span className="tabular-nums">123</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-line bg-bg-2 p-3 text-[13px] text-terra">
              {error}
            </div>
          )}

          <Button block size="lg" onClick={() => act('succeeded')} disabled={busy !== null}>
            {busy === 'pay' ? 'Processing…' : `Pay $${dollars(booking.totalCents)}`}
          </Button>

          <button
            type="button"
            onClick={() => act('failed')}
            disabled={busy !== null}
            className="mx-auto text-[13px] text-text-3 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy === 'decline' ? 'Cancelling…' : 'Simulate a declined card'}
          </button>

          <p className="flex items-center justify-center gap-[7px] text-[11px] text-text-3">
            <Icon name="lock" size={12} /> This is a simulated payment page for demonstration.
          </p>
        </div>
      </div>
    </div>
  );
}
