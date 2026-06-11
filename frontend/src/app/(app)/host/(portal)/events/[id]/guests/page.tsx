import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Avatar, Badge, Icon } from '@/components/atoms';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import {
  ApiError,
  authedGetJson,
  type HostEventDto,
  type RosterEntryDto,
} from '@/lib/api';
import { formatDateLabel, formatTimeLabel } from '@/lib/mappers';
import { HOST_LINKS } from '../../../host-nav';

export const dynamic = 'force-dynamic';

/** Guest roster: dietary restrictions + payment status (events spec §4/§6). */
export default async function GuestManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let event: HostEventDto;
  let roster: RosterEntryDto[];
  try {
    [event, roster] = await Promise.all([
      authedGetJson<{ event: HostEventDto }>(`/api/host/events/${id}`, token).then((r) => r.event),
      authedGetJson<{ roster: RosterEntryDto[] }>(`/api/host/events/${id}/guests`, token).then(
        (r) => r.roster,
      ),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  const active = roster.filter((r) => r.bookingStatus === 'confirmed' || r.bookingStatus === 'pending');
  const past = roster.filter((r) => r.bookingStatus === 'cancelled' || r.bookingStatus === 'refunded');

  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[900px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <Link href="/host/events" className="flex items-center gap-[7px] text-[13px] text-text-3">
              <Icon name="chevL" size={15} /> My events
            </Link>
            <h1 className="font-serif text-[34px] leading-tight">{event.title}</h1>
            <p className="text-sm text-text-2">
              {formatDateLabel(event.startsAt)} · {formatTimeLabel(event.startsAt)} ·{' '}
              {event.seatsBooked}/{event.seatsTotal} seats sold
            </p>
          </header>

          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-12 text-center">
              <p className="font-serif text-xl">No guests yet</p>
              <p className="text-sm text-text-2">Bookings will appear here as they come in.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {active.map((entry) => (
                <li
                  key={entry.bookingId}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar seed={entry.avatarSeed} name={entry.guestName} size={44} />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{entry.guestName}</span>
                      <span className="text-[12.5px] text-text-3">
                        {entry.seats} {entry.seats > 1 ? 'seats' : 'seat'} · {entry.confirmationCode}
                      </span>
                      {entry.dietaryPrefs.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          {entry.dietaryPrefs.map((pref) => (
                            <span
                              key={pref}
                              className="rounded-full border border-line bg-bg-2 px-2.5 py-0.5 text-[11.5px] text-text-2"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge tone={entry.bookingStatus === 'confirmed' ? 'verified' : 'soon'}>
                      {entry.bookingStatus}
                    </Badge>
                    <Badge tone={entry.paymentStatus === 'succeeded' ? 'gold' : 'soon'}>
                      {entry.paymentStatus ?? 'unpaid'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-3">Cancelled / refunded</h2>
              <ul className="flex flex-col gap-2">
                {past.map((entry) => (
                  <li
                    key={entry.bookingId}
                    className="flex items-center justify-between rounded-md border border-line bg-bg-2 px-4 py-2.5 text-[13px] text-text-3"
                  >
                    <span>
                      {entry.guestName} · {entry.seats} {entry.seats > 1 ? 'seats' : 'seat'}
                    </span>
                    <span>{entry.bookingStatus}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
