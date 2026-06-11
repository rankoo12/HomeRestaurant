'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, Input } from '@/components/atoms';
import { FoodImage } from '@/components/molecules';
import { cn } from '@/lib/cn';
import type { HostEventDto } from '@/lib/api';

interface Course {
  name: string;
  description: string;
}

interface FormState {
  title: string;
  cuisine: string;
  shortDescription: string;
  neighborhood: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  durationMinutes: number;
  price: number; // dollars in the form; sent as cents
  seatsTotal: number;
  imageSeed: number;
  courses: Course[];
  tags: string[];
}

const TAG_OPTIONS = [
  'Communal table',
  'Vegetarian friendly',
  'Vegan options',
  'Halal options',
  'Kosher-style',
  'Gluten-free aware',
  'BYOB',
  'Outdoor seating',
];

function toState(event?: HostEventDto): FormState {
  const starts = event ? new Date(event.startsAt) : null;
  return {
    title: event?.title ?? '',
    cuisine: event?.cuisine ?? '',
    shortDescription: event?.shortDescription ?? '',
    neighborhood: event?.neighborhood ?? '',
    date: starts ? starts.toISOString().slice(0, 10) : '',
    time: starts ? starts.toISOString().slice(11, 16) : '19:00',
    durationMinutes: event?.durationMinutes ?? 180,
    price: event ? Math.round(event.priceCents / 100) : 60,
    seatsTotal: event?.seatsTotal ?? 8,
    imageSeed: event?.imageSeed ?? 2,
    courses: event?.courses?.map((c) => ({ name: c.name, description: c.description })) ?? [
      { name: 'To start', description: '' },
    ],
    tags: event?.tags ?? [],
  };
}

/**
 * The event builder (events spec §6) — used for both create and edit. The
 * backend enforces the mutability matrix; a 409 here surfaces its message
 * (price/schedule locked once booked, capacity floor, …).
 */
export function EventForm({ event }: { event?: HostEventDto }) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const [form, setForm] = useState<FormState>(() => toState(event));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCourse = (i: number, patch: Partial<Course>) =>
    setForm((f) => ({
      ...f,
      courses: f.courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));

  const valid =
    form.title.length >= 4 &&
    form.cuisine.length >= 2 &&
    form.shortDescription.length >= 20 &&
    form.neighborhood.length >= 2 &&
    form.date !== '' &&
    form.courses.length >= 1 &&
    form.courses.every((c) => c.name.length >= 2 && c.description.length >= 4);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        cuisine: form.cuisine,
        shortDescription: form.shortDescription,
        neighborhood: form.neighborhood,
        startsAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        durationMinutes: form.durationMinutes,
        priceCents: Math.round(form.price * 100),
        seatsTotal: form.seatsTotal,
        imageSeed: form.imageSeed,
        courses: form.courses.map((c, i) => ({ position: i + 1, ...c })),
        tags: form.tags,
      };
      const res = await fetch(
        isEdit ? `/api/proxy/host/events/${event!.id}` : '/api/proxy/host/events',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? 'Could not save the event — check the fields.');
        return;
      }
      router.push('/host/events');
      router.refresh();
    } catch {
      setError('Could not save the event — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Basics</h2>
        <Input label="Title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Sunday Jollof & Suya Table" />
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Cuisine" value={form.cuisine} onChange={(e) => set('cuisine', e.target.value)} />
          <Input label="Neighborhood" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold tracking-[0.02em] text-text-2">
            Short description
          </span>
          <textarea
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            rows={3}
            className="rounded-sm border border-line bg-bg-2 px-[15px] py-3 text-[14.5px] focus:border-gold-line focus:bg-surface focus:outline-none"
            placeholder="What makes this table worth crossing town for? (at least 20 characters)"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-semibold tracking-[0.02em] text-text-2">Photo style</span>
          <div className="flex gap-2.5">
            {[0, 2, 4, 6].map((seed) => (
              <button
                key={seed}
                type="button"
                aria-label={`Photo style ${seed}`}
                aria-pressed={form.imageSeed === seed}
                onClick={() => set('imageSeed', seed)}
                className={cn(
                  'h-14 w-20 overflow-hidden rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]',
                  form.imageSeed === seed ? 'border-gold' : 'border-line',
                )}
              >
                <FoodImage seed={seed} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Schedule, pricing & capacity</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} hint="Publishing needs at least 48 hours of lead time" />
          <Input label="Start time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Input
            label="Duration (minutes)"
            type="number"
            min={60}
            max={480}
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
          />
          <Input
            label="Price per seat ($)"
            type="number"
            min={10}
            max={500}
            value={form.price}
            onChange={(e) => set('price', Number(e.target.value))}
          />
          <Input
            label="Seats"
            type="number"
            min={2}
            max={24}
            value={form.seatsTotal}
            onChange={(e) => set('seatsTotal', Number(e.target.value))}
          />
        </div>
        {isEdit && (
          <p className="text-xs text-text-3">
            Price and schedule lock once guests book; capacity can never drop below seats already
            committed.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">The menu</h2>
        {form.courses.map((course, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-md border border-line bg-bg-2 p-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm italic text-gold">Course {i + 1}</span>
              {form.courses.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove course ${i + 1}`}
                  onClick={() =>
                    setForm((f) => ({ ...f, courses: f.courses.filter((_, idx) => idx !== i) }))
                  }
                  className="text-xs text-text-3 underline-offset-2 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-[180px_1fr]">
              <Input
                aria-label={`Course ${i + 1} name`}
                value={course.name}
                onChange={(e) => setCourse(i, { name: e.target.value })}
                placeholder="To start"
              />
              <Input
                aria-label={`Course ${i + 1} description`}
                value={course.description}
                onChange={(e) => setCourse(i, { description: e.target.value })}
                placeholder="Seasonal mezze for the table"
              />
            </div>
          </div>
        ))}
        {form.courses.length < 8 && (
          <Button
            variant="ghost"
            onClick={() =>
              setForm((f) => ({ ...f, courses: [...f.courses, { name: '', description: '' }] }))
            }
          >
            <Icon name="plus" size={14} /> Add course
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-serif text-xl">Tags</h2>
        <div className="flex flex-wrap gap-2.5">
          {TAG_OPTIONS.map((tag) => {
            const active = form.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  set('tags', active ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])
                }
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]',
                  active ? 'border-gold text-gold' : 'border-line text-text-2',
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push('/host/events')} disabled={busy}>
          Discard
        </Button>
        <Button size="lg" onClick={save} disabled={!valid || busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
        </Button>
      </div>
    </div>
  );
}
