import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Badge, Icon } from '@/components/atoms';
import { FoodImage, MetaStat } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, getBookingView } from '@/lib/api';
import { dollars, formatDateLabel, formatTimeLabel } from '@/lib/mappers';
import { PendingPoller } from './pending-poller';

export const dynamic = 'force-dynamic';

/**
 * Booking confirmation — receipt, directions, itinerary pointer. While the
 * webhook is still in flight (status `pending` right after Stripe redirects
 * back), a small poller refreshes until the booking leaves `pending`.
 * See docs/specs/payments.md §4 step 5.
 */
export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let view;
  try {
    view = await getBookingView(id, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }
  const { booking, event, payment } = view;
  const dateLabel = formatDateLabel(event.startsAt);
  const timeLabel = formatTimeLabel(event.startsAt);

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[680px] px-8 pb-20 pt-10">
        {booking.status === 'pending' && (
          <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
            <Icon name="clock" size={28} className="text-gold" />
            <h1 className="font-serif text-3xl">Finalizing your booking…</h1>
            <p className="max-w-[420px] text-sm text-text-2">
              We&apos;re waiting for the payment confirmation — this usually takes a few seconds.
            </p>
            <PendingPoller bookingId={booking.id} />
          </section>
        )}

        {booking.status === 'confirmed' && (
          <div className="flex flex-col gap-6">
            <header className="flex flex-col items-center gap-3 text-center">
              <Badge tone="verified">
                <Icon name="shield" size={13} /> Confirmed
              </Badge>
              <h1 className="font-serif text-[34px] leading-tight">You&apos;re going to dinner!</h1>
              <p className="text-sm text-text-2">
                Confirmation code{' '}
                <b className="font-serif text-base tracking-[0.08em] text-gold">
                  {booking.confirmationCode}
                </b>
              </p>
            </header>

            <section className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-40">
                <FoodImage seed={event.imageSeed} />
              </div>
              <div className="flex flex-col gap-5 p-6">
                <Link href={`/events/${event.slug}`} className="font-serif text-2xl leading-snug">
                  {event.title}
                </Link>
                <div className="grid grid-cols-2 gap-[18px]">
                  <MetaStat icon="cal" label="Date" value={`${dateLabel} · ${timeLabel}`} />
                  <MetaStat icon="users" label="Party" value={`${booking.seats} ${booking.seats > 1 ? 'seats' : 'seat'}`} />
                  <MetaStat icon="pin" label="Directions" value={event.neighborhood} />
                  <MetaStat icon="card" label="Paid" value={`$${dollars(booking.totalCents)}`} />
                </div>
                <p className="text-[13px] leading-relaxed text-text-3">
                  The exact address and arrival notes are shared by your host closer to the dinner.
                  Bring your confirmation code — and your appetite.
                </p>
              </div>
            </section>

            <Link href="/events" className="mx-auto text-[13px] text-text-3 underline-offset-2 hover:underline">
              Browse more dinners
            </Link>
          </div>
        )}

        {(booking.status === 'cancelled' || booking.status === 'refunded') && (
          <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
            <Icon name="lock" size={28} className="text-gold" />
            <h1 className="font-serif text-3xl">
              {booking.status === 'refunded' ? 'Booking refunded' : 'Booking cancelled'}
            </h1>
            <p className="max-w-[420px] text-sm text-text-2">
              {booking.status === 'refunded'
                ? 'Your payment was refunded in full.'
                : payment?.status === 'failed'
                  ? 'The payment didn’t complete, so no seats were taken and no charge was made.'
                  : 'This booking is no longer active.'}{' '}
              <Link href={`/events/${event.slug}`} className="text-gold underline-offset-2 hover:underline">
                {event.title}
              </Link>{' '}
              may still have seats.
            </p>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
