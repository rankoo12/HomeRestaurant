import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Icon, VerifiedPill } from '@/components/atoms';
import { chefPhoto } from '@/lib/chef-photos';
import { EventCard, FoodImage } from '@/components/molecules';
import { Footer, ReviewList } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { getChef, ApiError } from '@/lib/api';
import { toEventCardModel, toReviewModel } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export default async function ChefProfilePage({
  params,
}: {
  params: Promise<{ chefId: string }>;
}) {
  const { chefId: slug } = await params;

  let chef;
  try {
    chef = await getChef(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const stats = [
    { n: chef.stats.dinnersHosted, l: 'Dinners hosted' },
    { n: chef.stats.reviewCount, l: 'Reviews' },
    { n: chef.stats.rating, l: 'Avg rating' },
    { n: chef.hostingSince ?? '—', l: 'Hosting since' },
  ];

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />

      {/* cover */}
      <div className="relative h-[300px]">
        <FoodImage seed={chef.coverSeed} glyph={false} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(16,12,9,.25), rgba(16,12,9,.9))' }}
        />
        <Link
          href="/events"
          className="absolute left-8 top-[22px] flex items-center gap-[7px] rounded-full border border-line-strong bg-black/50 px-4 py-[9px] text-[13px] text-white backdrop-blur-sm"
        >
          <Icon name="chevL" size={15} /> Back
        </Link>
      </div>

      <div className="relative mx-auto -mt-[72px] max-w-[1240px] px-8">
        {/* header */}
        <div className="mb-[34px] flex items-end gap-[22px]">
          <Avatar seed={chef.avatarSeed} name={chef.name} size={128} ring src={chefPhoto(chef.slug)} />
          <div className="flex flex-1 flex-col gap-2 pb-1.5">
            <div className="flex items-center gap-[11px]">
              <h1 className="font-serif text-[38px]">{chef.name}</h1>
              {chef.isSuperhost && <Badge tone="gold">Superhost</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-text-2">
              <span className="flex items-center gap-1.5">
                <Icon name="pin" size={14} /> {chef.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="globe" size={14} /> {chef.cuisine}
              </span>
              <VerifiedPill />
            </div>
          </div>
        </div>

        <div className="grid items-start gap-11 md:grid-cols-[320px_1fr]">
          {/* left rail */}
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-[18px] rounded-lg border border-line bg-surface p-6">
              {stats.map((s) => (
                <div key={s.l} className="flex flex-col">
                  <span className="font-serif text-[26px]">{s.n}</span>
                  <span className="text-[12.5px] text-text-3">{s.l}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-[15px] rounded-lg border border-line bg-surface p-6">
              <span className="text-sm font-bold">Verified by Ratatouille</span>
              {chef.badges.map((b) => (
                <div key={b} className="flex items-center gap-[11px] text-[13.5px] text-text-2">
                  <Icon name="check" size={16} stroke={2.2} className="text-sage" /> {b}
                </div>
              ))}
            </div>
          </div>

          {/* right */}
          <div className="flex flex-col gap-[34px]">
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl">About {chef.name.split(' ')[0]}</h2>
              <p className="text-[15.5px] leading-relaxed text-text-2">{chef.bio}</p>
            </div>

            <div className="flex flex-col gap-[18px]">
              <h2 className="font-serif text-2xl">Upcoming dinners</h2>
              {chef.upcomingEvents.length > 0 ? (
                <div className="grid gap-[22px] md:grid-cols-2">
                  {chef.upcomingEvents.map((e) => (
                    <Link key={e.slug} href={`/events/${e.slug}`}>
                      <EventCard event={toEventCardModel(e)} compact />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-3">No upcoming dinners right now.</p>
              )}
            </div>

            <div className="flex flex-col gap-[18px]">
              <h2 className="flex items-center gap-2.5 font-serif text-2xl">
                <Icon name="star" size={20} filled className="text-gold" />
                {chef.stats.rating} · {chef.stats.reviewCount} reviews
              </h2>
              {chef.reviews.length > 0 ? (
                <ReviewList reviews={chef.reviews.map(toReviewModel)} columns={1} />
              ) : (
                <p className="text-sm text-text-3">No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
