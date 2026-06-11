import Link from 'next/link';
import { Avatar, Button, Icon } from '@/components/atoms';
import { EventCard, EventFeature, FoodImage, SearchBar } from '@/components/molecules';
import { Footer, Hero } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { listEvents } from '@/lib/api';
import { toEventCardModel } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

const HOW_IT_WORKS = [
  {
    icon: 'shield' as const,
    h: 'Every host is verified',
    d: 'ID checks, food-safety certification and a kitchen inspection before a single seat goes on sale.',
  },
  {
    icon: 'lock' as const,
    h: 'Pay securely, in seconds',
    d: 'Your card is charged only when a seat is confirmed. Full refund if a host cancels.',
  },
  {
    icon: 'users' as const,
    h: 'Sit down with strangers',
    d: "Communal tables and chef's counters designed for conversation, not just a meal.",
  },
];

export default async function LandingPage() {
  const { events, total } = await listEvents({ sort: 'soonest', limit: 7 });
  const models = events.map(toEventCardModel);
  const tonight = models.slice(0, 3);
  const feature = models[0];

  const chefs = Array.from(new Map(events.map((e) => [e.chef.slug, e.chef])).values()).slice(0, 4);

  return (
    <>
      <SiteNav />

      <Hero
        kicker="A seat at someone's table"
        title={
          <>
            Dinner is ready in <span className="italic text-[#F2BE72]">someone&apos;s home</span> tonight
          </>
        }
        subtitle="Book a place at intimate dinners cooked by verified home chefs — from a five-seat kaiseki counter to a loud, generous jollof table."
        imageSeed={feature?.imageSeed ?? 16}
        actions={
          <Link href="/events">
            <Button size="lg">
              Explore tonight&apos;s dinners <Icon name="arrow" size={18} />
            </Button>
          </Link>
        }
        floating={<SearchBar floating />}
      />

      <div className="mx-auto flex max-w-[1240px] flex-col gap-[54px] px-8 pt-20">
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">
                Tonight near you
              </div>
              <h2 className="font-serif text-[30px]">Tables filling up this week</h2>
            </div>
            <Link href="/events">
              <Button variant="solid" size="sm">
                View all {total} dinners
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {tonight.map((ev) => (
              <Link key={ev.slug} href={`/events/${ev.slug}`}>
                <EventCard event={ev} />
              </Link>
            ))}
          </div>
        </section>

        {feature && (
          <Link href={`/events/${feature.slug}`}>
            <EventFeature event={feature} />
          </Link>
        )}

        <section className="flex flex-col gap-7 py-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">
              How it works
            </div>
            <h2 className="font-serif text-[30px]">Trust, built into every booking</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.h} className="flex flex-col gap-3.5 rounded-lg border border-line bg-surface p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold-soft text-gold-2">
                  <Icon name={s.icon} size={22} />
                </div>
                <h3 className="font-serif text-xl">{s.h}</h3>
                <p className="text-sm leading-relaxed text-text-2">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">The hosts</div>
            <h2 className="font-serif text-[30px]">Chefs worth crossing town for</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {chefs.map((c) => (
              <Link
                key={c.slug}
                href={`/chefs/${c.slug}`}
                className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface"
              >
                <div className="relative h-[150px]">
                  <FoodImage seed={c.avatarSeed + 10} />
                  <div className="absolute -bottom-[22px] left-[18px]">
                    <Avatar seed={c.avatarSeed} name={c.name} size={56} ring />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 px-[18px] pb-5 pt-[30px]">
                  <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                    {c.name}
                    <Icon name="shield" size={13} stroke={1.8} className="text-sage" />
                  </span>
                  <span className="flex items-center gap-1.5 text-[12.5px] text-gold">
                    <Icon name="star" size={12} filled /> {c.rating}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
