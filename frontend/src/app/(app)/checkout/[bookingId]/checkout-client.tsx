'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/atoms';
import { FoodImage } from '@/components/molecules';
import type { BookingViewDto } from '@/lib/api';
import { dollars, formatDateLabel, formatTimeLabel } from '@/lib/mappers';

function remainingSeconds(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/**
 * Client half of checkout: hold countdown, "Pay with card" hand-off to the
 * hosted Stripe page, cancel, and the Payment-Failed / hold-expired states
 * (inputs live server-side on the booking, so nothing is lost on reload).
 */
export function CheckoutClient({
  initialView,
  paymentCancelled,
}: {
  initialView: BookingViewDto;
  paymentCancelled: boolean;
}) {
  const router = useRouter();
  const { booking, hold, payment, event } = initialView;
  const [busy, setBusy] = useState<'pay' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    hold && hold.status === 'active' ? remainingSeconds(hold.expiresAt) : 0,
  );

  const holdLive = hold?.status === 'active' && secondsLeft > 0;

  useEffect(() => {
    if (!holdLive) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          router.refresh(); // hold lapsed → server view flips to the expired state
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [holdLive, router]);

  useEffect(() => {
    if (booking.status === 'confirmed') router.replace(`/guest/bookings/${booking.id}`);
  }, [booking.status, booking.id, router]);

  async function pay() {
    setBusy('pay');
    setError(null);
    try {
      const res = await fetch(`/api/proxy/bookings/${booking.id}/checkout-session`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError(data?.error?.message ?? 'Could not start the payment — please try again.');
      if (res.status === 409) router.refresh();
    } catch {
      setError('Could not start the payment — please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('cancel');
    try {
      await fetch(`/api/proxy/bookings/${booking.id}/cancel`, { method: 'POST' });
      router.push(`/events/${event.slug}`);
    } finally {
      setBusy(null);
    }
  }

  const dateLabel = `${formatDateLabel(event.startsAt)} · ${formatTimeLabel(event.startsAt)}`;
  const subtotal = booking.seats * event.priceCents;
  const fee = booking.totalCents - subtotal;

  // ---- Hold expired / booking cancelled: re-reserve state ----
  if (booking.status === 'cancelled' || (!holdLive && booking.status === 'pending')) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
        <Icon name="clock" size={28} className="text-gold" />
        <h1 className="font-serif text-3xl">Your seat hold expired</h1>
        <p className="max-w-[420px] text-sm text-text-2">
          Seats are only held for a short while during checkout, and this one has lapsed — you
          haven&apos;t been charged. If the dinner still has room you can reserve again.
        </p>
        <Link href={`/events/${event.slug}`}>
          <Button size="lg">Back to {event.title}</Button>
        </Link>
      </section>
    );
  }

  if (booking.status === 'refunded') {
    return (
      <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
        <Icon name="lock" size={28} className="text-gold" />
        <h1 className="font-serif text-3xl">Those seats were taken</h1>
        <p className="max-w-[420px] text-sm text-text-2">
          Your payment went through after the seats had been claimed by another guest, so we
          refunded it in full. Nothing more to do — find another dinner below.
        </p>
        <Link href="/events">
          <Button size="lg">Browse dinners</Button>
        </Link>
      </section>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const showPaymentFailed = paymentCancelled || payment?.status === 'failed';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] leading-tight">Confirm and pay</h1>
        <p
          className="flex items-center gap-2 text-sm text-text-2"
          aria-live="polite"
        >
          <Icon name="clock" size={14} className="text-gold" />
          Seats held for{' '}
          <b className="tabular-nums text-text">
            {minutes}:{String(seconds).padStart(2, '0')}
          </b>
        </p>
      </header>

      {showPaymentFailed && (
        <div role="alert" className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          <b>Your payment didn&apos;t go through</b> — no charge was made.
          {payment?.failureReason === 'session_expired'
            ? ' The payment window expired.'
            : ''}{' '}
          Your seats are still held while the timer runs; try again below.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          {error}
        </div>
      )}

      {/* order summary */}
      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
            <FoodImage seed={event.imageSeed} src={event.coverPhoto} alt={event.title} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-serif text-lg leading-snug">{event.title}</span>
            <span className="text-[13px] text-text-2">
              {dateLabel} · {event.neighborhood}
            </span>
          </div>
        </div>

        <div className="h-px bg-line" />

        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-2">
              ${dollars(event.priceCents)} × {booking.seats}{' '}
              {booking.seats > 1 ? 'seats' : 'seat'}
            </dt>
            <dd className="tabular-nums">${dollars(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-2">Service fee</dt>
            <dd className="tabular-nums">${dollars(fee)}</dd>
          </div>
          <div className="h-px bg-line" />
          <div className="flex items-center justify-between font-bold">
            <dt>Total</dt>
            <dd className="font-serif text-[18px] tabular-nums">${dollars(booking.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <Button block size="lg" onClick={pay} disabled={busy !== null}>
        {busy === 'pay' ? 'Opening secure payment…' : 'Pay with card'}
      </Button>
      <p className="flex items-center justify-center gap-[7px] text-xs text-text-3">
        <Icon name="lock" size={13} /> Secure payment hosted by Stripe — your card never touches
        our servers.
      </p>

      <button
        type="button"
        onClick={cancel}
        disabled={busy !== null}
        className="mx-auto text-[13px] text-text-3 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
      >
        {busy === 'cancel' ? 'Releasing seats…' : 'Cancel and release my seats'}
      </button>
    </div>
  );
}
