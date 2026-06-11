'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Stars } from '@/components/atoms';
import type { AdminFlaggedReviewDto } from '@/lib/api';
import { formatDateLabel } from '@/lib/mappers';

/**
 * One flagged review with full context — dismiss / remove (reviews spec §11).
 * Remove is a hard delete with a confirm; an already-removed review (another
 * admin won the race) comes back 404 and we just refresh the queue.
 */
export function FlaggedReviewCard({ item }: { item: AdminFlaggedReviewDto }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'dismiss' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'dismiss' | 'remove') {
    if (
      action === 'remove' &&
      !window.confirm(
        `Remove this review of ${item.chef.name}? It is deleted for good and the chef's rating recomputes.`,
      )
    ) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res =
        action === 'dismiss'
          ? await fetch(`/api/proxy/admin/reviews/${item.id}/dismiss-flag`, { method: 'POST' })
          : await fetch(`/api/proxy/admin/reviews/${item.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? 'Action failed — please try again.');
        return;
      }
      // 404 = already actioned by another admin; refreshing clears it either way.
      router.refresh();
    } catch {
      setError('Action failed — please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Avatar seed={item.author.avatarSeed} name={item.author.name} size={40} />
          <div className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="font-semibold">{item.author.name}</span>
              <Stars value={item.rating} size={14} />
              <span className="text-[12px] text-text-3">
                written {formatDateLabel(item.createdAt)} · flagged {formatDateLabel(item.flaggedAt)}
              </span>
            </span>
            <span className="text-[13px] text-text-2">
              On{' '}
              <Link
                href={`/events/${item.event.slug}`}
                className="text-gold underline-offset-2 hover:underline"
              >
                {item.event.title}
              </Link>{' '}
              by{' '}
              <Link
                href={`/chefs/${item.chef.slug}`}
                className="text-gold underline-offset-2 hover:underline"
              >
                {item.chef.name}
              </Link>{' '}
              · dinner on {formatDateLabel(item.event.startsAt)}
            </span>
            <p className="text-sm">{item.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => act('dismiss')} disabled={busy !== null}>
            {busy === 'dismiss' ? 'Dismissing…' : 'Dismiss flag'}
          </Button>
          <Button size="sm" onClick={() => act('remove')} disabled={busy !== null}>
            {busy === 'remove' ? 'Removing…' : 'Remove review'}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-right text-xs text-terra">
          {error}
        </p>
      )}
    </article>
  );
}
