'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import type { AdminUserDto } from '@/lib/api';

/**
 * Per-row user actions (admin spec §3/§6/§8). Admin rows and the viewer's own
 * row get no actions — the backend enforces the same invariants; this is UX.
 * Suspension confirm spells out the side-effects; refunds are explicitly NOT
 * one of them (deliberate per-event decisions).
 */
export function UserActions({ user, viewerId }: { user: AdminUserDto; viewerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (user.role === 'admin' || user.id === viewerId) {
    return <span className="text-[12px] text-text-3">—</span>;
  }

  async function act(action: 'suspend' | 'unsuspend' | 'role', role?: 'guest' | 'host') {
    const confirmText =
      action === 'suspend'
        ? `Suspend ${user.fullName}? This logs them out everywhere, blocks login, and unpublishes their dinners. Existing bookings stay valid — refunds, if wanted, are per-event host-cancel decisions.`
        : action === 'unsuspend'
          ? `Unsuspend ${user.fullName}? They can log in again; their dinners stay unpublished until they republish.`
          : `Change ${user.fullName}'s role to ${role}?`;
    if (!window.confirm(confirmText)) return;

    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const path =
        action === 'role'
          ? `/api/proxy/admin/users/${user.id}/role`
          : `/api/proxy/admin/users/${user.id}/${action}`;
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'role' ? JSON.stringify({ role }) : undefined,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? 'Action failed — please try again.');
        return;
      }
      if (action === 'suspend' && typeof body?.upcomingConfirmedBookings === 'number') {
        const n = body.upcomingConfirmedBookings;
        if (n > 0) {
          setNotice(
            `${n} upcoming confirmed booking${n === 1 ? '' : 's'} remain${n === 1 ? 's' : ''} valid — refund per event via host-cancel if needed.`,
          );
        }
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
        {user.role === 'guest' && (
          <Button size="sm" variant="ghost" onClick={() => act('role', 'host')} disabled={busy !== null}>
            {busy === 'role' ? '…' : 'Make host'}
          </Button>
        )}
        {user.role === 'host' && (
          <Button size="sm" variant="ghost" onClick={() => act('role', 'guest')} disabled={busy !== null}>
            {busy === 'role' ? '…' : 'Make guest'}
          </Button>
        )}
        {user.isSuspended ? (
          <Button size="sm" variant="ghost" onClick={() => act('unsuspend')} disabled={busy !== null}>
            {busy === 'unsuspend' ? 'Restoring…' : 'Unsuspend'}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => act('suspend')} disabled={busy !== null}>
            {busy === 'suspend' ? 'Suspending…' : 'Suspend'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="max-w-[260px] text-right text-xs text-terra">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="max-w-[260px] text-right text-xs text-text-2">
          {notice}
        </p>
      )}
    </div>
  );
}
