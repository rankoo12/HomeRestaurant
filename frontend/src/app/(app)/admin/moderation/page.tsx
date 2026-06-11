import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, authedGetJson, type AdminFlaggedReviewDto } from '@/lib/api';
import { ADMIN_LINKS } from '../admin-nav';
import { FlaggedReviewCard } from './flagged-review-card';

export const dynamic = 'force-dynamic';

/** Moderation queue — flagged reviews with full context, oldest flag first (reviews spec §11). */
export default async function ContentModerationPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let items: AdminFlaggedReviewDto[];
  try {
    items = (
      await authedGetJson<{ items: AdminFlaggedReviewDto[] }>('/api/admin/reviews/flagged', token)
    ).items;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <>
      <SiteNav links={ADMIN_LINKS} />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-20 pt-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[34px] leading-tight">Moderation</h1>
            <p className="text-sm text-text-2">
              Dismiss keeps the review exactly as it was; remove deletes it for good and the
              chef&apos;s rating self-corrects.
            </p>
          </header>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-12 text-center">
              <p className="font-serif text-xl">Nothing waiting — nice.</p>
              <p className="text-sm text-text-2">Flagged reviews land here for a human decision.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id}>
                  <FlaggedReviewCard item={item} />
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
