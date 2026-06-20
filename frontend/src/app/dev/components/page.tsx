'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  Input,
  Logo,
  Price,
  Stars,
  Stepper,
  ThemeToggle,
  VerifiedPill,
} from '@/components/atoms';
import {
  EventCard,
  EventFeature,
  FoodImage,
  Kpi,
  MetaStat,
  ReviewCard,
  SearchBar,
  SeatsMeter,
} from '@/components/molecules';
import {
  BookingCard,
  CategoryRow,
  FilterRail,
  Footer,
  Hero,
  Nav,
} from '@/components/organisms';
import type { EventCardModel, ReviewModel } from '@/components/types';

const sampleEvent: EventCardModel = {
  id: 'jollof-sunday',
  slug: 'jollof-sunday',
  title: 'Sunday Jollof & Suya Table',
  cuisine: 'West African',
  neighborhood: 'Bed-Stuy, Brooklyn',
  dateLabel: 'Sun, Jun 7',
  timeLabel: '6:30 PM',
  price: 68,
  seatsLeft: 3,
  seatsTotal: 10,
  imageSeed: 16,
  short:
    'A loud, generous family-style feast built around smoky jollof, grilled suya and fried plantain.',
  chef: { name: 'Amara Okafor', rating: 4.97, reviews: 214, avatarSeed: 1, superhost: true },
};

const sampleReview: ReviewModel = {
  id: '1',
  author: 'Mara L.',
  avatarSeed: 31,
  rating: 5,
  dateLabel: 'May 2026',
  text: 'The most generous table I have sat at in years. The jollof deserves its reputation.',
};

const categories = [
  { id: 'all', label: 'All experiences' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'chefs', label: "Chef's tables" },
  { id: 'communal', label: 'Communal' },
];

const filterGroups = [
  { heading: 'Cuisine', items: ['West African', 'Italian', 'Kaiseki', 'Oaxacan'] },
  { heading: 'Dietary', items: ['Vegetarian', 'Halal', 'Gluten-free'] },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-line py-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsPreviewPage() {
  const [seats, setSeats] = useState(2);
  const [cat, setCat] = useState('all');
  const [maxPrice, setMaxPrice] = useState(140);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen">
      <Nav
        links={[
          { href: '/events', label: 'Browse', active: true },
          { href: '/guest/dashboard', label: 'My dinners' },
        ]}
      />

      <div className="mx-auto max-w-[1240px] px-8 pb-20">
        <div className="flex items-center justify-between py-8">
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">
              Design system
            </div>
            <h1 className="font-serif text-[40px]">Component library</h1>
          </div>
          <ThemeToggle />
        </div>

        <Section title="Atoms — Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Reserve a seat</Button>
            <Button variant="ghost">Message</Button>
            <Button variant="solid">View all</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Atoms — Chips, Badges, Pills">
          <div className="flex flex-wrap items-center gap-3">
            <Chip active>Active</Chip>
            <Chip>Inactive</Chip>
            <Badge tone="verified">
              <Icon name="shield" size={13} stroke={1.8} /> Verified
            </Badge>
            <Badge tone="soon">Almost full</Badge>
            <Badge tone="gold">Superhost</Badge>
            <VerifiedPill />
          </div>
        </Section>

        <Section title="Atoms — Brand, Avatar, Stars, Price, Stepper">
          <div className="flex flex-wrap items-center gap-8">
            <Logo />
            <div className="flex items-center gap-3">
              <Avatar seed={1} name="Amara Okafor" />
              <Avatar seed={3} name="Sora Tanaka" ring />
            </div>
            <Stars value={4.5} />
            <Price value={68} />
            <Price value={140} big />
            <Stepper value={seats} onChange={setSeats} max={8} />
          </div>
        </Section>

        <Section title="Atoms — Inputs">
          <div className="flex max-w-md flex-col gap-4">
            <Input label="Email" type="email" placeholder="you@example.com" />
            <Input label="Password" type="password" hint="At least 8 characters." />
            <Input label="With error" error="That email is already taken" defaultValue="taken@x.co" />
          </div>
        </Section>

        <Section title="Atoms — Icons">
          <div className="flex flex-wrap gap-4 text-text-2">
            {(['search', 'star', 'pin', 'users', 'shield', 'heart', 'cal', 'lock', 'leaf', 'flame'] as const).map(
              (n) => (
                <Icon key={n} name={n} size={22} />
              ),
            )}
          </div>
        </Section>

        <Section title="Molecules — FoodImage, SeatsMeter, MetaStat, KPI">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-40 overflow-hidden rounded-lg">
              <FoodImage seed={2} />
            </div>
            <div className="flex flex-col justify-center gap-5">
              <SeatsMeter left={3} total={10} />
              <SeatsMeter left={7} total={12} />
              <MetaStat icon="cal" label="Date" value="Sun, Jun 7 · 6:30 PM" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Upcoming dinners" value="2" icon="cal" accent sub={<>Next: Sun, Jun 7</>} />
            <Kpi label="Seats sold" value="12" icon="users" />
            <Kpi label="Earnings (30d)" value="$1,344" icon="card" />
            <Kpi label="Rating" value="4.97" icon="star" sub={<>214 reviews</>} />
          </div>
        </Section>

        <Section title="Molecules — Event cards">
          <div className="grid gap-6 md:grid-cols-3">
            <EventCard event={sampleEvent} />
            <EventCard event={{ ...sampleEvent, seatsLeft: 7 }} compact />
            <div className="md:col-span-1">
              <ReviewCard review={sampleReview} />
            </div>
          </div>
          <EventFeature event={sampleEvent} />
        </Section>

        <Section title="Molecules — SearchBar">
          <SearchBar />
        </Section>

        <Section title="Organisms — CategoryRow, FilterRail, BookingCard">
          <CategoryRow categories={categories} active={cat} onChange={setCat} />
          <div className="grid gap-8 md:grid-cols-[248px_1fr]">
            <FilterRail
              groups={filterGroups}
              selected={selected}
              onToggle={(item) => setSelected((s) => ({ ...s, [item]: !s[item] }))}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              onClear={() => setSelected({})}
            />
            <div className="max-w-sm">
              <BookingCard
                price={68}
                rating={4.97}
                seatsLeft={3}
                seatsTotal={10}
                dateLabel="Sun, Jun 7"
                seats={seats}
                onSeatsChange={setSeats}
              />
            </div>
          </div>
        </Section>

        <Section title="Organisms — Hero">
          <div className="overflow-hidden rounded-lg">
            <Hero
              kicker="Anyone can cook"
              title={<>Dinner is ready in someone&apos;s home tonight</>}
              subtitle="Book a place at intimate dinners cooked by verified home chefs."
              actions={<Button size="lg">Explore tonight&apos;s dinners</Button>}
            />
          </div>
        </Section>
      </div>

      <Footer />
    </div>
  );
}
