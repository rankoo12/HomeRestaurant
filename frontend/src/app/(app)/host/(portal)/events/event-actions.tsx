'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';

/**
 * Per-event action row (publish/unpublish/duplicate/cancel — events spec §6).
 * Cancel asks for confirmation: it refunds every confirmed booking.
 */
export function EventActions({
  eventId,
  status,
  confirmedBookings,
}: {
  eventId: string;
  status: string;
  confirmedBookings: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'publish' | 'unpublish' | 'cancel' | 'duplicate') {
    if (
      action === 'cancel' &&
      !window.confirm(
        confirmedBookings > 0
          ? `Cancel this dinner? ${confirmedBookings} paid booking(s) will be refunded in full.`
          : 'Cancel this dinner? This cannot be undone.',
      )
    ) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/host/events/${eventId}/${action}`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? 'Action failed — please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Action failed — please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {(status === 'draft' || status === 'unpublished') && (
          <Button size="sm" onClick={() => act('publish')} disabled={busy !== null}>
            {busy === 'publish' ? 'Publishing…' : 'Publish'}
          </Button>
        )}
        {status === 'published' && (
          <Button size="sm" variant="ghost" onClick={() => act('unpublish')} disabled={busy !== null}>
            {busy === 'unpublish' ? '…' : 'Unpublish'}
          </Button>
        )}
        {status !== 'cancelled' && status !== 'completed' && (
          <Link href={`/host/events/${eventId}/edit`}>
            <Button size="sm" variant="ghost">Edit</Button>
          </Link>
        )}
        <Button size="sm" variant="ghost" onClick={() => act('duplicate')} disabled={busy !== null}>
          {busy === 'duplicate' ? '…' : 'Duplicate'}
        </Button>
        {status !== 'cancelled' && status !== 'completed' && (
          <Button size="sm" variant="ghost" onClick={() => act('cancel')} disabled={busy !== null}>
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-right text-xs text-terra">
          {error}
        </p>
      )}
    </div>
  );
}
