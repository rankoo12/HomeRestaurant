import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/atoms';
import { Kpi } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type EarningsDto } from '@/lib/api';
import { dollars, formatDateLabel } from '@/lib/mappers';
import { HOST_LINKS } from '../host-nav';

export const dynamic = 'force-dynamic';

/**
 * Earnings — payout ledger (payments spec §11). Ledger-only in Phase 7:
 * real Stripe Connect transfers are deferred, so "pending" rows are amounts
 * owed, not in-flight transfers.
 */
export default async function EarningsPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let earnings: EarningsDto;
  try {
    earnings = await authedGetJson<EarningsDto>('/api/host/earnings', token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }
  const { rows, summary } = earnings;

  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[34px] leading-tight">Earnings & payouts</h1>
            <p className="text-sm text-text-2">
              You earn the full seat price; the platform keeps the guest service fee.
            </p>
          </header>

          <div className="grid gap-[18px] sm:grid-cols-2 md:grid-cols-4">
            <Kpi label="Lifetime earnings" value={`$${dollars(summary.lifetimeNetCents)}`} icon="card" accent />
            <Kpi label="Pending" value={`$${dollars(summary.pendingNetCents)}`} icon="clock" />
            <Kpi label="Paid out" value={`$${dollars(summary.paidNetCents)}`} icon="shield" />
            <Kpi label="Platform fees" value={`$${dollars(summary.feesWithheldCents)}`} icon="users" />
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-12 text-center">
              <p className="font-serif text-xl">No payouts yet</p>
              <p className="text-sm text-text-2">
                Every confirmed booking creates a payout record here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] uppercase tracking-[0.08em] text-text-3">
                    <th className="px-5 py-3.5 font-semibold">Dinner</th>
                    <th className="px-5 py-3.5 font-semibold">Booking</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Gross</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Fee</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Net</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
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
                      <td className="px-5 py-3.5 text-right tabular-nums">${dollars(row.grossCents)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-text-3">
                        −${dollars(row.feeCents)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                        ${dollars(row.netCents)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge
                          tone={
                            row.status === 'paid' ? 'verified' : row.status === 'pending' ? 'gold' : 'soon'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
