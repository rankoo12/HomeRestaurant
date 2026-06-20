import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Badge, Button, Icon } from '@/components/atoms';
import { FoodImage } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import {
  ApiError,
  authedGetJson,
  type GuestBookingDto,
  type GuestBookingsDto,
  type ReviewableDto,
} from '@/lib/api';
import { dollars, formatDateLabel, formatTimeLabel } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  confirmed: 'verified',
  pending: 'gold',
  refunded: 'soon',
  cancelled: 'soon',
} as const;

function BookingRow({ b, faded = false }: { b: GuestBookingDto; faded?: boolean }) {
  return (
    <li
      className={`flex items-center gap-4 rounded-lg border border-line bg-surface p-4 ${faded ? 'opacity-70' : ''}`}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
        <FoodImage seed={b.eventImageSeed} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/events/${b.eventSlug}`} className="truncate font-serif text-lg leading-snug">
          {b.eventTitle}
        </Link>
        <span className="text-[13px] text-text-2">
          {formatDateLabel(b.eventStartsAt)} · {formatTimeLabel(b.eventStartsAt)} · {b.eventNeighborhood}
        </span>
        <span className="text-[12.5px] text-text-3">
          {b.seats} {b.seats > 1 ? 'seats' : 'seat'} · ${dollars(b.totalCents)} · Hosted by {b.chefName}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge tone={STATUS_TONE[b.bookingStatus]}>{b.bookingStatus}</Badge>
        <Link href={`/guest/bookings/${b.bookingId}`}>
          <Button size="sm" variant="ghost">
            View
          </Button>
        </Link>
      </div>
    </li>
  );
}

/**
 * Guest dashboard — upcoming reservations, past dinners, and "awaiting your
 * review" prompts. See reviews spec §3/§6.
 */
export default async function GuestDashboardPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let bookings: GuestBookingsDto;
  let reviewable: ReviewableDto['reviewable'];
  try {
    [bookings, reviewable] = await Promise.all([
      authedGetJson<GuestBookingsDto>('/api/guest/bookings', token),
      authedGetJson<ReviewableDto>('/api/guest/reviewable', token).then((r) => r.reviewable),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-9">
          <h1 className="font-serif text-[34px] leading-tight">Your dinners</h1>

          {/* Upcoming */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl">Upcoming reservations</h2>
            {bookings.upcoming.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {bookings.upcoming.map((b) => (
                  <BookingRow key={b.bookingId} b={b} />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-10 text-center">
                <Icon name="cal" size={24} className="text-gold" />
                <p className="text-sm text-text-2">No upcoming dinners yet — find a seat at someone&apos;s table.</p>
                <Link href="/events">
                  <Button>Browse dinners</Button>
                </Link>
              </div>
            )}
          </section>

          {/* Awaiting review */}
          {reviewable.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">Awaiting your review</h2>
              <ul className="flex flex-col gap-3">
                {reviewable.map((item) => (
                  <li
                    key={item.bookingId}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <Link href={`/events/${item.eventSlug}`} className="font-serif text-lg leading-snug">
                        {item.eventTitle}
                      </Link>
                      <span className="text-[13px] text-text-2">{formatDateLabel(item.startsAt)}</span>
                    </div>
                    <Link href={`/guest/reviews/new?bookingId=${item.bookingId}`}>
                      <Button size="sm">
                        <Icon name="star" size={14} /> Write a review
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Past */}
          {bookings.past.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">Past &amp; cancelled</h2>
              <ul className="flex flex-col gap-3">
                {bookings.past.map((b) => (
                  <BookingRow key={b.bookingId} b={b} faded />
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
