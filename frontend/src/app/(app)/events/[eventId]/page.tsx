import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Chip, Icon, VerifiedPill } from '@/components/atoms';
import { FoodImage, MetaStat } from '@/components/molecules';
import { Footer, ReviewList } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { getEvent, ApiError } from '@/lib/api';
import { chefPhoto } from '@/lib/chef-photos';
import { dollars, formatDateLabel, formatTimeLabel, toReviewModel } from '@/lib/mappers';
import { BookingWidget } from './booking-widget';

export const dynamic = 'force-dynamic';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hrs`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: slug } = await params;

  let event;
  try {
    event = await getEvent(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const { chef } = event;
  const dateLabel = formatDateLabel(event.startsAt);
  const timeLabel = formatTimeLabel(event.startsAt);
  // Real gallery — exactly the photos the host uploaded (cover first).
  const photos = event.photos ?? [];
  const cover = photos[0] ?? null;
  const rest = photos.slice(1);

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />

      <div className="mx-auto max-w-[1240px] px-8 pt-6">
        <Link href="/events" className="mb-[18px] flex items-center gap-[7px] text-[13px] text-text-3">
          <Icon name="chevL" size={15} /> All dinners
        </Link>

        {/* gallery — only the host's real photos */}
        {rest.length > 0 ? (
          <div className="grid h-[350px] grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2.5 overflow-hidden rounded-lg">
            <div className="relative row-span-2">
              <FoodImage seed={event.imageSeed} glyph={false} src={cover} alt={event.title} />
              {photos.length > 1 && (
                <span className="absolute left-4 top-4">
                  <Badge tone="gold">
                    <Icon name="cam" size={13} /> {photos.length} photos
                  </Badge>
                </span>
              )}
            </div>
            {rest.slice(0, 4).map((p, i) => (
              <div key={i} className="relative">
                <FoodImage seed={event.imageSeed} src={p} alt={`${event.title} photo ${i + 2}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[350px] overflow-hidden rounded-lg">
            <FoodImage seed={event.imageSeed} glyph={false} src={cover} alt={event.title} />
          </div>
        )}

        {/* body */}
        <div className="mt-9 grid items-start gap-12 md:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">
                  {event.cuisine}
                </span>
                {event.seatsLeft <= 3 && <Badge tone="soon">Only {event.seatsLeft} seats left</Badge>}
              </div>
              <h1 className="max-w-[560px] font-serif text-[42px] leading-[1.05]">{event.title}</h1>
              <div className="flex flex-wrap gap-[18px] text-sm text-text-2">
                <span className="flex items-center gap-1.5">
                  <Icon name="star" size={14} filled className="text-gold" />
                  <b className="text-text">{chef.stats.rating}</b> · {chef.stats.reviewCount} reviews
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="pin" size={14} /> {event.neighborhood}
                </span>
              </div>
            </div>

            {/* host strip */}
            <Link
              href={`/chefs/${chef.slug}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-[18px]"
            >
              <div className="flex items-center gap-4">
                <Avatar seed={chef.avatarSeed} name={chef.name} size={56} ring src={chefPhoto(chef.slug)} />
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-[7px] text-base font-semibold">
                    {chef.name} <VerifiedPill />
                  </span>
                  <span className="text-[13.5px] text-text-2">{chef.tagline}</span>
                </div>
              </div>
              <Icon name="chevR" size={20} className="text-text-3" />
            </Link>

            {/* meta grid */}
            <div className="grid grid-cols-2 gap-[18px]">
              <MetaStat icon="cal" label="Date" value={`${dateLabel} · ${timeLabel}`} />
              <MetaStat icon="clock" label="Duration" value={formatDuration(event.durationMinutes)} />
              <MetaStat icon="users" label="Table size" value={`Up to ${event.seatsTotal} guests`} />
              <MetaStat icon="pin" label="Neighborhood" value={event.neighborhood} />
            </div>

            <div className="h-px bg-line" />

            {/* about */}
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl">About this dinner</h2>
              <p className="text-[15.5px] leading-relaxed text-text-2">
                {event.shortDescription} {chef.bio}
              </p>
              <div className="mt-1 flex flex-wrap gap-2.5">
                {event.tags.map((t) => (
                  <Chip key={t} className="pointer-events-none">
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            {/* menu */}
            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">The menu</h2>
              <div className="flex flex-col rounded-lg border border-line bg-surface px-[26px]">
                {event.courses.map((c, i) => (
                  <div
                    key={c.position}
                    className="flex items-start gap-6 py-5"
                    style={i < event.courses.length - 1 ? { borderBottom: '1px solid var(--line)' } : undefined}
                  >
                    <span className="min-w-[90px] pt-0.5 font-serif text-sm italic text-gold">
                      {c.name}
                    </span>
                    <span className="text-[15px] leading-normal">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-line" />

            {/* reviews */}
            <div className="flex flex-col gap-[18px]">
              <div className="flex items-center gap-2.5">
                <Icon name="star" size={22} filled className="text-gold" />
                <h2 className="font-serif text-2xl">
                  {chef.stats.rating} · {chef.stats.reviewCount} reviews
                </h2>
              </div>
              {event.reviews.length > 0 ? (
                <ReviewList reviews={event.reviews.map(toReviewModel)} columns={2} />
              ) : (
                <p className="text-sm text-text-3">No reviews yet for this dinner.</p>
              )}
            </div>
          </div>

          {/* sticky booking */}
          <div className="sticky top-24">
            <BookingWidget
              eventId={event.id}
              price={dollars(event.priceCents)}
              rating={chef.stats.rating}
              seatsLeft={event.seatsLeft}
              seatsTotal={event.seatsTotal}
              dateLabel={dateLabel}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
