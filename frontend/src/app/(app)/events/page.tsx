import Link from 'next/link';
import { Button } from '@/components/atoms';
import { EventCard, SearchBar } from '@/components/molecules';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { listEvents } from '@/lib/api';
import { toEventCardModel } from '@/lib/mappers';
import { FiltersClient } from './filters-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  cuisine?: string;
  tags?: string;
  maxPrice?: string;
  sort?: string;
  where?: string;
  date?: string;
  seats?: string;
}

const SORTS = new Set(['soonest', 'price', 'top-rated']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cuisine = sp.cuisine || undefined;
  const tags = sp.tags ? sp.tags.split(',').filter(Boolean) : [];
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : 160;
  const sort = (sp.sort && SORTS.has(sp.sort) ? sp.sort : 'soonest') as
    | 'soonest'
    | 'price'
    | 'top-rated';
  // Search-bar params: where / when / seats (discovery spec query params).
  const where = sp.where?.trim() || undefined;
  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : undefined;
  const seatsNum = sp.seats ? Number(sp.seats) : undefined;
  const minSeats =
    seatsNum && Number.isInteger(seatsNum) && seatsNum >= 1 && seatsNum <= 24
      ? seatsNum
      : undefined;

  const { events, total } = await listEvents({
    cuisine,
    tags: tags.length ? tags : undefined,
    maxPrice: maxPrice < 160 ? maxPrice : undefined,
    where,
    date,
    minSeats,
    sort,
    limit: 24,
  });
  const models = events.map(toEventCardModel);

  // The search bar carries the rail filters along, so a new search keeps them.
  const extraParams: Record<string, string> = {};
  if (sp.cuisine) extraParams.cuisine = sp.cuisine;
  if (sp.tags) extraParams.tags = sp.tags;
  if (sp.maxPrice) extraParams.maxPrice = sp.maxPrice;
  if (sp.sort) extraParams.sort = sp.sort;

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse', active: true }]} />

      <section className="border-b border-line bg-bg-2">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-[22px] px-8 pb-[34px] pt-10 text-center">
          <h1 className="max-w-[640px] font-serif text-[40px] leading-tight text-balance">
            Find a seat at a <span className="italic text-gold-2">home dinner</span> near you
          </h1>
          <SearchBar
            initialWhere={where}
            initialDate={date}
            initialSeats={minSeats}
            extraParams={extraParams}
          />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1240px] gap-10 px-8 pt-[34px] md:grid-cols-[248px_1fr]">
        <FiltersClient cuisine={cuisine} tags={tags} maxPrice={maxPrice} sort={sort} />

        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-[23px]">
              {total} {total === 1 ? 'dinner' : 'dinners'} this week
            </h2>
            <span className="text-[13px] text-text-3">Across verified home kitchens</span>
          </div>

          {models.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface py-20 text-center">
              <h3 className="font-serif text-[22px]">No dinners match those filters</h3>
              <p className="max-w-sm text-sm text-text-2">
                Try widening your price range or clearing a filter to see more tables.
              </p>
              <Link href="/events">
                <Button variant="solid">Clear filters</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-[22px] sm:grid-cols-2">
              {models.map((ev) => (
                <Link key={ev.slug} href={`/events/${ev.slug}`}>
                  <EventCard event={ev} compact />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
