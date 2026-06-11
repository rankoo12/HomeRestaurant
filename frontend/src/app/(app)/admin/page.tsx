import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { Kpi } from '@/components/molecules';
import { ACCESS_COOKIE } from '@/lib/auth';
import {
  ApiError,
  authedGetJson,
  type AdminMetricsDto,
  type AdminPayoutDto,
} from '@/lib/api';
import { dollars } from '@/lib/mappers';
import { ADMIN_LINKS } from './admin-nav';
import { PayoutLedger } from './payout-ledger';

export const dynamic = 'force-dynamic';

/** Admin dashboard — KPIs link to their queues + the pending payout ledger (admin spec §3/§5). */
export default async function AdminDashboardPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let metrics: AdminMetricsDto;
  let payouts: AdminPayoutDto[];
  try {
    metrics = (await authedGetJson<{ metrics: AdminMetricsDto }>('/api/admin/metrics', token))
      .metrics;
    payouts = (
      await authedGetJson<{ payouts: AdminPayoutDto[] }>(
        '/api/admin/payouts?status=pending',
        token,
      )
    ).payouts;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  const totalUsers =
    metrics.usersByRole.guest + metrics.usersByRole.host + metrics.usersByRole.admin;

  return (
    <>
      <SiteNav links={ADMIN_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[34px] leading-tight">Platform overview</h1>
            <p className="text-sm text-text-2">
              The humans behind the trust promises — queues first, numbers second.
            </p>
          </header>

          <div className="grid gap-[18px] sm:grid-cols-2 md:grid-cols-3">
            <Link href="/admin/verifications">
              <Kpi
                label="Pending verifications"
                value={String(metrics.pendingVerifications)}
                icon="shield"
                accent={metrics.pendingVerifications > 0}
              />
            </Link>
            <Link href="/admin/moderation">
              <Kpi
                label="Flagged reviews"
                value={String(metrics.flaggedReviews)}
                icon="flame"
                accent={metrics.flaggedReviews > 0}
              />
            </Link>
            <Link href="/admin/users">
              <Kpi
                label="Users"
                value={String(totalUsers)}
                icon="users"
                sub={`${metrics.usersByRole.guest} guests · ${metrics.usersByRole.host} hosts · ${metrics.usersByRole.admin} admins`}
              />
            </Link>
            <Kpi label="Bookings (30d)" value={String(metrics.bookingsLast30d)} icon="cal" />
            <Kpi
              label="Gross revenue (30d)"
              value={`$${dollars(metrics.grossRevenueCentsLast30d)}`}
              icon="card"
            />
            <Link href="/events">
              <Kpi
                label="Upcoming dinners"
                value={String(metrics.upcomingPublishedEvents)}
                icon="plate"
              />
            </Link>
          </div>

          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h2 className="font-serif text-2xl">Pending payouts</h2>
              <p className="text-sm text-text-2">
                Mark paid records that the money moved outside the platform — the ledger is the
                record, not the transfer.
              </p>
            </header>
            <PayoutLedger payouts={payouts} />
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
