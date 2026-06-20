'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Badge, Button, Icon } from '@/components/atoms';
import type { AdminVerificationItemDto } from '@/lib/api';
import { formatDateLabel } from '@/lib/mappers';

const KIND_LABEL: Record<string, string> = {
  id_document: 'ID document',
  food_safety_cert: 'Food-safety certificate',
  kitchen_inspection: 'Kitchen inspection',
};

/**
 * One pending application: expandable profile + KYC detail, then
 * approve / reject-with-required-notes (chef-onboarding spec §11).
 */
export function VerificationCard({ item }: { item: AdminVerificationItemDto }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function decide(action: 'approve' | 'reject') {
    if (action === 'approve' && !window.confirm(`Approve ${item.name}? They can publish dinners immediately.`)) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/admin/verifications/${item.chefId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ notes: notes.trim() }) : undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? 'Action failed — please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Action failed — please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar seed={item.avatarSeed} name={item.name} size={44} />
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2.5">
              <span className="font-serif text-lg leading-snug">{item.name}</span>
              <Badge tone="soon">pending</Badge>
            </span>
            <span className="text-[13px] text-text-2">
              {item.cuisine} · {item.city} · applied {formatDateLabel(item.appliedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide details' : 'Review details'}
          </Button>
          <Button size="sm" onClick={() => decide('approve')} disabled={busy !== null}>
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRejecting((v) => !v)}
            disabled={busy !== null}
          >
            Reject…
          </Button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4 rounded-md border border-line bg-bg-2 p-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-3">
              Profile
            </span>
            <p>
              <b>{item.tagline}</b> · /chefs/{item.slug} · {item.email}
            </p>
            <p className="text-text-2">{item.bio}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-3">
              KYC submissions (full history)
            </span>
            <ul className="flex flex-col gap-1">
              {item.verifications.map((v) => {
                const imageSrc = v.documentRef?.startsWith('data:image/') ? v.documentRef : null;
                return (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <Icon name={v.kind === 'id_document' ? 'shield' : 'check'} size={14} />
                    <span>{KIND_LABEL[v.kind] ?? v.kind}</span>
                    {imageSrc ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(imageSrc)}
                        className="inline-flex items-center gap-1.5 text-gold underline-offset-2 hover:underline"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 KYC image */}
                        <img
                          src={imageSrc}
                          alt="KYC document"
                          className="h-10 w-14 rounded border border-line object-cover"
                        />
                        view full
                      </button>
                    ) : (
                      <span className="text-text-3">{v.documentRef ?? 'no reference'}</span>
                    )}
                    <span className="text-text-3">· {formatDateLabel(v.createdAt)}</span>
                    <Badge tone={v.status === 'approved' ? 'verified' : v.status === 'pending' ? 'gold' : 'soon'}>
                      {v.status}
                    </Badge>
                    {v.notes && <span className="text-text-3">“{v.notes}”</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="flex flex-col gap-2 rounded-md border border-line bg-bg-2 p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[13px] font-semibold">
              Rejection notes <span className="text-text-3">(required — the applicant reads these)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="rounded-sm border border-line bg-surface px-[15px] py-3 text-[14.5px] focus:border-gold-line focus:outline-none"
              placeholder="What needs to change before resubmission? (at least 4 characters)"
            />
            <span className="text-xs text-text-3">{notes.length}/500</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={busy !== null}>
              Keep in queue
            </Button>
            <Button
              size="sm"
              onClick={() => decide('reject')}
              disabled={busy !== null || notes.trim().length < 4}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject application'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-right text-xs text-terra">
          {error}
        </p>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-6 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 KYC image */}
          <img
            src={lightbox}
            alt="KYC document full view"
            className="max-h-[85vh] max-w-[90vw] rounded-lg border border-line object-contain shadow-pop"
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-surface text-text shadow-pop"
          >
            <Icon name="plus" size={20} className="rotate-45" />
          </button>
        </div>
      )}
    </article>
  );
}
