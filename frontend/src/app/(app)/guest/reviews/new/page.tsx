import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, getBookingView, type BookingViewDto } from '@/lib/api';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

/**
 * Review submission (reviews spec §3/§6): loads the booking server-side; the
 * blocked states render instead of the form when ineligible. The backend is
 * the real gate — this page is the friendly version of its answers.
 */
export default async function ReviewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');
  if (!bookingId) redirect('/guest/dashboard');

  let view: BookingViewDto;
  try {
    view = await getBookingView(bookingId, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[620px] px-8 pb-20 pt-10">
        <ReviewForm
          bookingId={view.booking.id}
          bookingStatus={view.booking.status}
          eventTitle={view.event.title}
          eventSlug={view.event.slug}
          startsAt={view.event.startsAt}
        />
      </div>
      <Footer />
    </>
  );
}
