'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/atoms';
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
  foodSafetyDeclared: boolean;
  certificateRef: string;
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
    foodSafetyDeclared: false,
    certificateRef: '',
  });

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
          idDocument: { kind: data.docKind, reference: data.docReference },
          foodSafety: {
            declared: true,
            ...(data.certificateRef ? { certificateRef: data.certificateRef } : {}),
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
