import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Badge, Button } from '@/components/atoms';
import { FoodImage, SeatsMeter } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type HostEventDto } from '@/lib/api';
import { dollars, formatDateLabel } from '@/lib/mappers';
import { HOST_LINKS } from '../host-nav';
import { EventActions } from './event-actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'verified' | 'soon' | 'gold'> = {
  published: 'verified',
  draft: 'soon',
  unpublished: 'soon',
  cancelled: 'soon',
  completed: 'gold',
};

/** Event management list (events spec §6). */
export default async function HostEventsPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let events: HostEventDto[];
  try {
    events = (await authedGetJson<{ events: HostEventDto[] }>('/api/host/events', token)).events;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={HOST_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex items-end justify-between gap-4">
            <h1 className="font-serif text-[34px] leading-tight">My events</h1>
            <Link href="/host/events/create">
              <Button>New dinner</Button>
            </Link>
          </header>

          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-12 text-center">
              <p className="font-serif text-xl">No events yet</p>
              <p className="text-sm text-text-2">Your first dinner starts in the builder.</p>
              <Link href="/host/events/create">
                <Button variant="ghost">Create an event</Button>
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Link
                      href={
                        event.status === 'published'
                          ? `/events/${event.slug}`
                          : `/host/events/${event.id}/edit`
                      }
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-md"
                      aria-label={`View ${event.title}`}
                    >
                      <FoodImage seed={event.imageSeed} src={event.coverPhoto} alt={event.title} />
                    </Link>
                    <div className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-2.5">
                        <Link
                          href={
                            event.status === 'published'
                              ? `/events/${event.slug}`
                              : `/host/events/${event.id}/edit`
                          }
                          className="font-serif text-lg leading-snug hover:text-gold-2"
                        >
                          {event.title}
                        </Link>
                        <Badge tone={STATUS_TONE[event.status] ?? 'soon'}>{event.status}</Badge>
                      </span>
                      <span className="text-[13px] text-text-2">
                        {formatDateLabel(event.startsAt)} · ${dollars(event.priceCents)} / seat ·{' '}
                        <Link
                          href={`/host/events/${event.id}/guests`}
                          className="text-gold underline-offset-2 hover:underline"
                        >
                          {event.confirmedBookings ?? 0} booking{(event.confirmedBookings ?? 0) === 1 ? '' : 's'}
                        </Link>
                      </span>
                      <div className="max-w-[220px]">
                        <SeatsMeter
                          left={event.seatsTotal - event.seatsBooked}
                          total={event.seatsTotal}
                        />
                      </div>
                    </div>
                  </div>
                  <EventActions
                    eventId={event.id}
                    status={event.status}
                    confirmedBookings={event.confirmedBookings ?? 0}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
