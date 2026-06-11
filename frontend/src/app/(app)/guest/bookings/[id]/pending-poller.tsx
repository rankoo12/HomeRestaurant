'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls the booking until it leaves `pending` (the webhook is the authority,
 * not the Stripe redirect), then refreshes the server view. Gives up after
 * ~90s — the page copy already tells the guest what's happening.
 */
export function PendingPoller({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const tries = useRef(0);

  useEffect(() => {
    const t = setInterval(async () => {
      tries.current += 1;
      if (tries.current > 45) {
        clearInterval(t);
        return;
      }
      try {
        const res = await fetch(`/api/proxy/bookings/${bookingId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.booking?.status && data.booking.status !== 'pending') {
          clearInterval(t);
          router.refresh();
        }
      } catch {
        // transient — keep polling
      }
    }, 2000);
    return () => clearInterval(t);
  }, [bookingId, router]);

  return null;
}
