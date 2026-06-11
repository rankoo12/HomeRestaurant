'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon, Stepper } from '@/components/atoms';

export interface SearchBarProps {
  floating?: boolean;
  /** Prefill values (the /events page echoes the active URL params back in). */
  initialWhere?: string;
  initialDate?: string;
  initialSeats?: number;
  /** Params to carry along on search (e.g. active cuisine/tags/sort filters). */
  extraParams?: Record<string, string>;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SEATS = 8;

// --- local-date helpers (no Date libs; YYYY-MM-DD in local time) -------------

function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Next Saturday (or today if it is one) — the "This weekend" quick pick. */
function nextWeekend(): Date {
  const today = startOfToday();
  return addDays(today, (6 - today.getDay() + 7) % 7);
}

function dateLabel(key: string | null): string {
  if (!key) return 'Any day';
  return fromKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Pill search bar — wired to discovery (where / when / seats → /events query
 * params; see docs/specs/discovery/01-events-read-api.md). The When and Seats
 * fields open design-system popovers (mini calendar / Stepper) instead of the
 * browser's native controls. Submitting navigates, so results stay
 * server-rendered and shareable.
 */
export function SearchBar({
  floating = false,
  initialWhere = '',
  initialDate = '',
  initialSeats,
  extraParams = {},
}: SearchBarProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement>(null);
  const [where, setWhere] = useState(initialWhere);
  const [date, setDate] = useState<string | null>(initialDate || null);
  const [seats, setSeats] = useState<number>(initialSeats ?? 0); // 0 = any
  const [open, setOpen] = useState<'when' | 'seats' | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = initialDate ? fromKey(initialDate) : startOfToday();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Close popovers on outside click / Escape.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function search() {
    const params = new URLSearchParams(extraParams);
    if (where.trim()) params.set('where', where.trim());
    if (date) params.set('date', date);
    if (seats > 0) params.set('seats', String(seats));
    const qs = params.toString();
    setOpen(null);
    router.push(`/events${qs ? `?${qs}` : ''}`);
  }

  function pickDate(d: Date | null) {
    setDate(d ? toKey(d) : null);
    if (d) setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setOpen(null);
  }

  // --- calendar grid for the viewed month ------------------------------------
  const today = startOfToday();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = viewMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
    ),
  ];
  const atCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  const quickPicks: Array<{ label: string; date: Date | null }> = [
    { label: 'Any day', date: null },
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Weekend', date: nextWeekend() },
  ];

  const cell =
    'flex flex-1 items-center gap-[11px] rounded-full px-[18px] py-[9px] text-left transition-colors focus-within:bg-surface-2 hover:bg-surface-2';
  const label = 'text-[11px] font-bold uppercase tracking-[0.08em] text-text-3';
  const popover =
    'absolute left-1/2 top-[calc(100%+10px)] z-40 -translate-x-1/2 rounded-lg border border-line bg-surface p-4 shadow-pop';

  return (
    <form
      ref={rootRef}
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
      className={cn(
        'relative flex w-full max-w-[680px] items-center gap-0.5 rounded-full border border-line-strong bg-surface p-1.5',
        floating ? 'shadow-pop' : 'shadow-soft',
      )}
    >
      {/* Where */}
      <label className={cell}>
        <Icon name="pin" size={18} className="shrink-0 text-gold" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={label}>Where</span>
          <input
            type="text"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            onFocus={() => setOpen(null)}
            placeholder="City or neighborhood"
            maxLength={80}
            className="w-full bg-transparent text-[13.5px] font-semibold text-text placeholder:font-medium placeholder:text-text-3 focus:outline-none"
          />
        </span>
      </label>

      <span className="h-[30px] w-px shrink-0 bg-line" />

      {/* When */}
      <div className="relative flex-1">
        <button
          type="button"
          aria-expanded={open === 'when'}
          onClick={() => setOpen(open === 'when' ? null : 'when')}
          className={cn(cell, 'w-full')}
        >
          <Icon name="cal" size={18} className="shrink-0 text-gold" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={label}>When</span>
            <span className={cn('text-[13.5px] font-semibold', !date && 'text-text-2')}>
              {dateLabel(date)}
            </span>
          </span>
          <Icon
            name="chevD"
            size={14}
            className={cn('shrink-0 text-text-3 transition-transform', open === 'when' && 'rotate-180')}
          />
        </button>

        {open === 'when' && (
          <div className={cn(popover, 'w-[300px]')} role="dialog" aria-label="Pick a date">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickPicks.map((q) => {
                const active = q.date === null ? date === null : date === toKey(q.date);
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => pickDate(q.date)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                      active
                        ? 'border-gold-line bg-gold-soft text-gold-2'
                        : 'border-line text-text-2 hover:border-line-strong hover:text-text',
                    )}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                disabled={atCurrentMonth}
                onClick={() =>
                  setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                }
                className="grid h-8 w-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2 disabled:opacity-30"
              >
                <Icon name="chevL" size={15} />
              </button>
              <span className="font-serif text-[15px]">{monthLabel}</span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                }
                className="grid h-8 w-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
              >
                <Icon name="chevR" size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {WEEKDAYS.map((d, i) => (
                <span key={`${d}${i}`} className="py-1 text-[10.5px] font-bold uppercase text-text-3">
                  {d}
                </span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={`pad-${i}`} />;
                const key = toKey(d);
                const past = d < today;
                const selected = date === key;
                const isToday = key === toKey(today);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={past}
                    onClick={() => pickDate(d)}
                    className={cn(
                      'mx-auto grid h-8 w-8 place-items-center rounded-full text-[13px] tabular-nums transition-colors',
                      selected
                        ? 'bg-gold font-bold text-on-gold'
                        : past
                          ? 'text-text-3 opacity-40'
                          : 'hover:bg-surface-2',
                      isToday && !selected && 'border border-gold-line font-semibold',
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <span className="h-[30px] w-px shrink-0 bg-line" />

      {/* Seats */}
      <div className="relative flex-1">
        <button
          type="button"
          aria-expanded={open === 'seats'}
          onClick={() => setOpen(open === 'seats' ? null : 'seats')}
          className={cn(cell, 'w-full')}
        >
          <Icon name="users" size={18} className="shrink-0 text-gold" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={label}>Seats</span>
            <span className={cn('text-[13.5px] font-semibold', seats === 0 && 'text-text-2')}>
              {seats === 0 ? 'Any' : `${seats} ${seats === 1 ? 'guest' : 'guests'}`}
            </span>
          </span>
          <Icon
            name="chevD"
            size={14}
            className={cn('shrink-0 text-text-3 transition-transform', open === 'seats' && 'rotate-180')}
          />
        </button>

        {open === 'seats' && (
          <div className={cn(popover, 'w-[240px]')} role="dialog" aria-label="Pick seats">
            <div className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-[13.5px] font-semibold">Guests</span>
                <span className="text-[12px] text-text-3">Seats at the table</span>
              </span>
              <Stepper
                value={seats === 0 ? 1 : seats}
                onChange={(v) => setSeats(v)}
                min={1}
                max={MAX_SEATS}
              />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => {
                  setSeats(0);
                  setOpen(null);
                }}
                className="text-[13px] font-semibold text-text-2 underline-offset-2 hover:underline"
              >
                Any
              </button>
              <button
                type="button"
                onClick={() => {
                  if (seats === 0) setSeats(1);
                  setOpen(null);
                }}
                className="rounded-full bg-gold px-4 py-1.5 text-[13px] font-semibold text-on-gold transition-colors hover:bg-gold-2"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        aria-label="Search"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-on-gold transition-colors hover:bg-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
      >
        <Icon name="search" size={19} />
      </button>
    </form>
  );
}
