import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button, Icon } from '@/components/atoms';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type ReviewableDto } from '@/lib/api';
import { formatDateLabel } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

/**
 * Guest dashboard — Phase 7 ships the "Awaiting your review" prompts
 * (reviews spec §3/§6); richer booking history views arrive with Phase 8
 * polish.
 */
export default async function GuestDashboardPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let reviewable: ReviewableDto['reviewable'];
  try {
    reviewable = (await authedGetJson<ReviewableDto>('/api/guest/reviewable', token)).reviewable;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <h1 className="font-serif text-[34px] leading-tight">Your dinners</h1>

          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl">Awaiting your review</h2>
            {reviewable.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {reviewable.map((item) => (
                  <li
                    key={item.bookingId}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/events/${item.eventSlug}`}
                        className="font-serif text-lg leading-snug"
                      >
                        {item.eventTitle}
                      </Link>
                      <span className="text-[13px] text-text-2">
                        {formatDateLabel(item.startsAt)}
                      </span>
                    </div>
                    <Link href={`/guest/reviews/new?bookingId=${item.bookingId}`}>
                      <Button size="sm">
                        <Icon name="star" size={14} /> Write a review
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-10 text-center">
                <Icon name="star" size={24} className="text-gold" />
                <p className="text-sm text-text-2">
                  Nothing to review — book your next dinner and come back hungry for stars.
                </p>
                <Link href="/events">
                  <Button variant="ghost">Browse dinners</Button>
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
