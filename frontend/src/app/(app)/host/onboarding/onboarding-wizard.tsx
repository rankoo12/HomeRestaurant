'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, Input } from '@/components/atoms';
import { FoodImage } from '@/components/molecules';
import { cn } from '@/lib/cn';

const STEPS = ['Profile', 'Identity', 'Food safety', 'Review'] as const;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .slice(0, 32)
      .replace(/^-+|-+$/g, '') || 'chef'
  );
}

interface WizardData {
  slug: string;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  coverSeed: number;
  docKind: 'passport' | 'drivers_license' | 'national_id';
  docReference: string;
  docImage: string; // base64 data URL, '' if none
  foodSafetyDeclared: boolean;
  certificateRef: string;
  certImage: string; // base64 data URL, '' if none
}

const MAX_UPLOAD_BYTES = 2_000_000; // ~2MB original

/** Read a chosen image file to a base64 data URL, rejecting non-images / too-large. */
function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      reject(new Error('Please choose a PNG, JPEG, or WebP image.'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('Image is too large (max 2MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 4-step onboarding wizard (chef-onboarding spec §3). Nothing persists until
 * the final submit; on success the proxy refreshes the session so the new
 * `host` role lands in the JWT without a re-login (approved scope decision).
 */
export function OnboardingWizard({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTaken, setSlugTaken] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>({
    slug: slugify(suggestedName),
    cuisine: '',
    city: '',
    tagline: '',
    bio: '',
    coverSeed: 3,
    docKind: 'passport',
    docReference: '',
    docImage: '',
    foodSafetyDeclared: false,
    certificateRef: '',
    certImage: '',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function pickImage(field: 'docImage' | 'certImage', file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    try {
      set(field, await readImageFile(file));
    } catch (e) {
      setUploadError((e as Error).message);
    }
  }

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const stepValid = [
    data.slug.length >= 2 &&
      data.cuisine.length >= 2 &&
      data.city.length >= 2 &&
      data.tagline.length >= 4 &&
      data.bio.length >= 40,
    data.docReference.length >= 4,
    data.foodSafetyDeclared,
    true,
  ][step];

  async function checkSlug() {
    try {
      const res = await fetch(
        `/api/proxy/host/onboarding/slug-check?slug=${encodeURIComponent(data.slug)}`,
      );
      const body = await res.json();
      setSlugTaken(body.available ? null : (body.suggestion ?? 'taken'));
    } catch {
      setSlugTaken(null);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/host/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: data.slug,
          cuisine: data.cuisine,
          city: data.city,
          tagline: data.tagline,
          bio: data.bio,
          coverSeed: data.coverSeed,
          idDocument: {
            kind: data.docKind,
            reference: data.docReference,
            ...(data.docImage ? { image: data.docImage } : {}),
          },
          foodSafety: {
            declared: true,
            ...(data.certificateRef ? { certificateRef: data.certificateRef } : {}),
            ...(data.certImage ? { image: data.certImage } : {}),
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? 'Something went wrong — please try again.');
        if (body?.error?.details?.field === 'slug') setStep(0);
        return;
      }
      // Role upgraded server-side → rotate the session so the JWT carries it.
      await fetch('/api/proxy/auth/refresh', { method: 'POST' });
      router.push('/host/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-[34px] leading-tight">Become a host</h1>
        <p className="text-sm text-text-2">
          Tell guests who you are, verify your identity, and you&apos;re in the review queue.
        </p>
      </header>

      {/* stepper */}
      <ol className="flex items-center gap-2" aria-label="Onboarding steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold',
                i <= step ? 'border-gold bg-gold text-bg' : 'border-line text-text-3',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-[12.5px]', i === step ? 'font-semibold' : 'text-text-3')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-line" />}
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        {step === 0 && (
          <>
            <Input
              label="URL handle"
              value={data.slug}
              onChange={(e) => set('slug', e.target.value)}
              onBlur={checkSlug}
              hint={slugTaken ? undefined : 'Your public page: /chefs/<handle>'}
              error={slugTaken ? `Taken — try "${slugTaken}"` : undefined}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Cuisine" value={data.cuisine} onChange={(e) => set('cuisine', e.target.value)} placeholder="West African" />
              <Input label="City" value={data.city} onChange={(e) => set('city', e.target.value)} placeholder="Brooklyn, NY" />
            </div>
            <Input
              label="Tagline"
              value={data.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="One line that captures your table"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Bio</span>
              <textarea
                value={data.bio}
                onChange={(e) => set('bio', e.target.value)}
                rows={5}
                className="rounded-md border border-line bg-bg-2 px-3.5 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
                placeholder="Your story, your kitchen, what guests should expect (at least 40 characters)…"
              />
              <span className="text-xs text-text-3">{data.bio.length}/2000</span>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Cover image</span>
              <div className="flex gap-2.5">
                {[1, 3, 5, 7].map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    aria-label={`Cover style ${seed}`}
                    aria-pressed={data.coverSeed === seed}
                    onClick={() => set('coverSeed', seed)}
                    className={cn(
                      'h-14 w-20 overflow-hidden rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]',
                      data.coverSeed === seed ? 'border-gold' : 'border-line',
                    )}
                  >
                    <FoodImage seed={seed} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-text-2">
              We verify every host&apos;s identity before they can publish a dinner. Enter your
              document details — originals are checked by our team, never stored here.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Document type</span>
              <select
                value={data.docKind}
                onChange={(e) => set('docKind', e.target.value as WizardData['docKind'])}
                className="rounded-md border border-line bg-bg-2 px-3.5 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s license</option>
                <option value="national_id">National ID</option>
              </select>
            </label>
            <Input
              label="Document number"
              value={data.docReference}
              onChange={(e) => set('docReference', e.target.value)}
              placeholder="P-1234567"
            />
            <ImageUpload
              label="Photo of your document"
              hint="Clear photo of your ID (PNG/JPEG/WebP, max 2MB)"
              value={data.docImage}
              onPick={(f) => pickImage('docImage', f)}
              onClear={() => set('docImage', '')}
            />
            {uploadError && <p className="text-[13px] text-terra">{uploadError}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-text-2">
              Home dining means feeding strangers from your kitchen — we take that seriously, and
              so should you.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={data.foodSafetyDeclared}
                onChange={(e) => set('foodSafetyDeclared', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
              />
              <span>
                I declare that I follow safe food handling practices and that my kitchen meets
                local home-kitchen requirements. <b>(required)</b>
              </span>
            </label>
            <Input
              label="Food-safety certificate (optional)"
              value={data.certificateRef}
              onChange={(e) => set('certificateRef', e.target.value)}
              placeholder="FS-2026-001"
              hint="Reference number, if you hold one"
            />
            <ImageUpload
              label="Photo of your certificate (optional)"
              hint="If you hold a food-safety certificate (PNG/JPEG/WebP, max 2MB)"
              value={data.certImage}
              onPick={(f) => pickImage('certImage', f)}
              onClear={() => set('certImage', '')}
            />
            {uploadError && <p className="text-[13px] text-terra">{uploadError}</p>}
          </>
        )}

        {step === 3 && (
          <dl className="flex flex-col gap-3 text-sm">
            {(
              [
                ['Handle', `/chefs/${data.slug}`],
                ['Cuisine', data.cuisine],
                ['City', data.city],
                ['Tagline', data.tagline],
                ['Identity', `${data.docKind.replace('_', ' ')} · ${data.docReference}`],
                ['Food safety', data.certificateRef ? `Declared · cert ${data.certificateRef}` : 'Declared'],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-b border-line pb-2.5 last:border-0">
                <dt className="shrink-0 text-text-3">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
            <p className="text-[12.5px] text-text-3">
              Submitting puts you in the verification queue. You can draft events right away;
              publishing opens once you&apos;re approved.
            </p>
          </dl>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid || busy}>
            Continue
          </Button>
        ) : (
          <Button size="lg" onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit application'}
          </Button>
        )}
      </div>
    </div>
  );
}

/** File picker with a thumbnail preview and a remove control. */
function ImageUpload({
  label,
  hint,
  value,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  value: string;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local base64 preview, not a remote asset */}
          <img
            src={value}
            alt="Uploaded document preview"
            className="h-20 w-28 rounded-md border border-line object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            className="text-[13px] text-text-2 underline-offset-2 hover:text-text hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-bg-2 px-3.5 py-5 text-sm text-text-2 transition-colors hover:border-gold-line hover:text-text">
          <Icon name="cam" size={16} className="text-gold" />
          Choose a photo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
      )}
      <span className="text-xs text-text-3">{hint}</span>
    </div>
  );
}
