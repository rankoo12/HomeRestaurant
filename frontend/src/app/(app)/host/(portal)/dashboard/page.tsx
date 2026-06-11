import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Badge, Button, Icon } from '@/components/atoms';
import { FoodImage, Kpi } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type HostDashboardDto, type OnboardingStateDto } from '@/lib/api';
import { dollars, formatDateLabel } from '@/lib/mappers';
import { HOST_LINKS } from '../host-nav';

export const dynamic = 'force-dynamic';

/** Host dashboard — KPIs + verification banner + next event (events spec §6). */
export default async function HostDashboardPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let dash: HostDashboardDto;
  let onboarding: OnboardingStateDto | null = null;
  try {
    dash = await authedGetJson<HostDashboardDto>('/api/host/dashboard', token);
    onboarding = await authedGetJson<OnboardingStateDto>('/api/host/onboarding', token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) redirect('/host/onboarding');
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  const rejectionNotes = onboarding?.verifications.find((v) => v.notes)?.notes;

  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex items-end justify-between gap-4">
            <h1 className="font-serif text-[34px] leading-tight">Host dashboard</h1>
            <Link href="/host/events/create">
              <Button>New dinner</Button>
            </Link>
          </header>

          {dash.verificationStatus === 'pending' && (
            <div
              className="flex items-center gap-3 rounded-md border border-line bg-bg-2 p-4 text-sm"
              role="status"
            >
              <Icon name="clock" size={16} className="shrink-0 text-gold" />
              <span>
                <b>Your application is being reviewed.</b> You can draft dinners now; publishing
                opens once you&apos;re verified.
              </span>
            </div>
          )}
          {dash.verificationStatus === 'rejected' && (
            <div
              className="flex items-start gap-3 rounded-md border border-line bg-bg-2 p-4 text-sm"
              role="alert"
            >
              <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-terra" />
              <span>
                <b>Your application needs another look.</b>
                {rejectionNotes ? ` Reviewer notes: ${rejectionNotes}` : ''}{' '}
                <Link href="/host/onboarding" className="text-gold underline-offset-2 hover:underline">
                  Edit & resubmit
                </Link>
              </span>
            </div>
          )}

          <div className="grid gap-[18px] sm:grid-cols-2 md:grid-cols-4">
            <Kpi label="Upcoming dinners" value={String(dash.upcomingEvents)} icon="cal" accent />
            <Kpi label="Seats sold" value={String(dash.seatsSold)} icon="users" />
            <Kpi label="Earnings to date" value={`$${dollars(dash.earningsNetCents)}`} icon="card" />
            <Kpi label="Rating" value={dash.rating ? dash.rating.toFixed(2) : '—'} icon="star" />
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl">Next dinner</h2>
            {dash.nextEvent ? (
              <Link
                href={`/host/events/${dash.nextEvent.id}/guests`}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
                    <FoodImage seed={dash.nextEvent.imageSeed} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-lg">{dash.nextEvent.title}</span>
                    <span className="text-[13px] text-text-2">
                      {formatDateLabel(dash.nextEvent.startsAt)} · {dash.nextEvent.seatsBooked}/
                      {dash.nextEvent.seatsTotal} seats sold
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[13px] text-text-3">
                  Guest roster <Icon name="chevR" size={16} />
                </span>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-10 text-center">
                <Badge tone="soon">No upcoming dinners</Badge>
                <p className="text-sm text-text-2">Your table is empty — create your next event.</p>
                <Link href="/host/events/create">
                  <Button variant="ghost">Open the event builder</Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
