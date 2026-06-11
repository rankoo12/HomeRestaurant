'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@/components/atoms';
import type { AdminPayoutDto } from '@/lib/api';
import { dollars, formatDateLabel } from '@/lib/mappers';

/**
 * Pending payout ledger with mark-paid (admin spec §3/§4). Mark-paid is a
 * ledger entry, not a money movement — the confirm copy says exactly that.
 */
export function PayoutLedger({ payouts }: { payouts: AdminPayoutDto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPaid(payout: AdminPayoutDto) {
    if (
      !window.confirm(
        `Mark $${dollars(payout.netCents)} to ${payout.chefName} as paid? This records that the money already moved outside the platform.`,
      )
    ) {
      return;
    }
    setBusy(payout.id);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/admin/payouts/${payout.id}/mark-paid`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? 'Could not mark the payout paid — please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not mark the payout paid — please try again.');
    } finally {
      setBusy(null);
    }
  }

  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-12 text-center">
        <p className="font-serif text-xl">Nothing waiting — nice.</p>
        <p className="text-sm text-text-2">Every pending payout has been settled.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[12px] uppercase tracking-[0.08em] text-text-3">
              <th className="px-5 py-3.5 font-semibold">Chef</th>
              <th className="px-5 py-3.5 font-semibold">Dinner</th>
              <th className="px-5 py-3.5 font-semibold">Booking</th>
              <th className="px-5 py-3.5 text-right font-semibold">Net</th>
              <th className="px-5 py-3.5 text-right font-semibold">Status</th>
              <th className="px-5 py-3.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5">{row.chefName}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col">
                    <span>{row.eventTitle ?? '—'}</span>
                    {row.eventStartsAt && (
                      <span className="text-[12px] text-text-3">
                        {formatDateLabel(row.eventStartsAt)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-text-2">{row.confirmationCode ?? '—'}</td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                  ${dollars(row.netCents)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Badge tone={row.status === 'paid' ? 'verified' : 'gold'}>{row.status}</Badge>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markPaid(row)}
                    disabled={busy !== null}
                  >
                    {busy === row.id ? 'Marking…' : 'Mark paid'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="text-right text-xs text-terra">
          {error}
        </p>
      )}
    </div>
  );
}
