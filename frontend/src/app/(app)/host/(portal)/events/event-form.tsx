'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, Input } from '@/components/atoms';
import { FoodImage } from '@/components/molecules';
import { AddressPicker } from '@/components/organisms';
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
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  durationMinutes: number;
  price: number; // dollars in the form; sent as cents
  seatsTotal: number;
  imageSeed: number;
  photos: string[]; // gallery (base64 data URLs), at least one required
  courses: Course[];
  tags: string[];
}

const MAX_IMAGE_BYTES = 2_000_000;
const MAX_PHOTOS = 6;

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      reject(new Error('Please choose a PNG, JPEG, or WebP image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image is too large (max 2MB).'));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
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

const MAX_TAGS = 5;

function toState(event?: HostEventDto): FormState {
  const starts = event ? new Date(event.startsAt) : null;
  return {
    title: event?.title ?? '',
    cuisine: event?.cuisine ?? '',
    shortDescription: event?.shortDescription ?? '',
    neighborhood: event?.neighborhood ?? '',
    addressLine: event?.addressLine ?? '',
    latitude: event?.latitude ?? null,
    longitude: event?.longitude ?? null,
    date: starts ? starts.toISOString().slice(0, 10) : '',
    time: starts ? starts.toISOString().slice(11, 16) : '19:00',
    durationMinutes: event?.durationMinutes ?? 180,
    price: event ? Math.round(event.priceCents / 100) : 60,
    seatsTotal: event?.seatsTotal ?? 8,
    imageSeed: event?.imageSeed ?? 2,
    photos: event?.photos ?? [],
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
  const [customTag, setCustomTag] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError(null);
    const room = MAX_PHOTOS - form.photos.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    try {
      const encoded = await Promise.all(chosen.map(readImage));
      setForm((f) => ({ ...f, photos: [...f.photos, ...encoded].slice(0, MAX_PHOTOS) }));
    } catch (e) {
      setImageError((e as Error).message);
    }
  }

  function removePhoto(index: number) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  }

  const atTagLimit = form.tags.length >= MAX_TAGS;

  function toggleTag(tag: string) {
    setForm((f) => {
      if (f.tags.includes(tag)) return { ...f, tags: f.tags.filter((t) => t !== tag) };
      if (f.tags.length >= MAX_TAGS) return f; // silently ignore over the cap
      return { ...f, tags: [...f.tags, tag] };
    });
  }

  function addCustomTag() {
    const tag = customTag.trim();
    if (!tag) return;
    setForm((f) =>
      f.tags.includes(tag) || f.tags.length >= MAX_TAGS ? f : { ...f, tags: [...f.tags, tag] },
    );
    setCustomTag('');
  }

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
    form.addressLine.length >= 4 &&
    form.date !== '' &&
    form.photos.length >= 1 &&
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
        addressLine: form.addressLine,
        latitude: form.latitude,
        longitude: form.longitude,
        startsAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        durationMinutes: form.durationMinutes,
        priceCents: Math.round(form.price * 100),
        seatsTotal: form.seatsTotal,
        imageSeed: form.imageSeed,
        photos: form.photos,
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
          <Input
            label="Neighborhood"
            value={form.neighborhood}
            onChange={(e) => set('neighborhood', e.target.value)}
            hint="Public area shown to everyone (not your exact address)"
          />
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
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold tracking-[0.02em] text-text-2">
              Photos <span className="font-normal text-text-3">(at least one — first is the cover)</span>
            </span>
            <span className="text-[12.5px] text-text-3">{form.photos.length}/{MAX_PHOTOS}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {form.photos.map((photo, i) => (
              <div key={i} className="relative h-20 w-28 overflow-hidden rounded-md border border-line">
                <FoodImage seed={form.imageSeed} src={photo} alt={`Photo ${i + 1}`} />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <Icon name="plus" size={14} className="rotate-45" />
                </button>
              </div>
            ))}
            {form.photos.length < MAX_PHOTOS && (
              <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong bg-bg-2 text-[12px] text-text-2 transition-colors hover:border-gold-line hover:text-text">
                <Icon name="cam" size={18} className="text-gold" />
                Add photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          <span className="text-xs text-text-3">PNG/JPEG/WebP, max 2MB each.</span>
          {form.photos.length === 0 && (
            <span className="text-[13px] text-terra">Add at least one photo to publish.</span>
          )}
          {imageError && <span className="text-[13px] text-terra">{imageError}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl">Location</h2>
          <p className="text-[13px] text-text-2">
            Your exact address stays private — guests only see it after they book and pay.
          </p>
        </div>
        <AddressPicker
          value={{
            addressLine: form.addressLine,
            latitude: form.latitude,
            longitude: form.longitude,
          }}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              addressLine: v.addressLine,
              latitude: v.latitude,
              longitude: v.longitude,
            }))
          }
        />
        {form.addressLine.length < 4 && (
          <span className="text-[13px] text-terra">Add the address where guests will dine.</span>
        )}
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
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl">Tags</h2>
          <span className="text-[12.5px] text-text-3">{form.tags.length}/{MAX_TAGS} chosen</span>
        </div>

        {/* selected tags — removable (covers presets + custom) */}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold-soft px-3 py-1.5 text-[13px] text-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
              >
                {tag}
                <Icon name="plus" size={12} className="rotate-45" />
              </button>
            ))}
          </div>
        )}

        {/* preset suggestions */}
        <div className="flex flex-wrap gap-2.5">
          {TAG_OPTIONS.filter((t) => !form.tags.includes(t)).map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={atTagLimit}
              onClick={() => toggleTag(tag)}
              className={cn(
                'rounded-full border border-line px-3.5 py-1.5 text-[13px] text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]',
                atTagLimit ? 'cursor-not-allowed opacity-40' : 'hover:border-gold-line hover:text-text',
              )}
            >
              + {tag}
            </button>
          ))}
        </div>

        {/* custom tag input */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Add your own tag"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder={atTagLimit ? 'Tag limit reached' : 'e.g. Wine pairing'}
              disabled={atTagLimit}
              maxLength={30}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={addCustomTag}
            disabled={atTagLimit || !customTag.trim()}
          >
            Add
          </Button>
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
