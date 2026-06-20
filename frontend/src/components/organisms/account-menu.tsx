'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Icon } from '@/components/atoms';
import type { IconName } from '@/components/atoms';

export type UserRole = 'guest' | 'host' | 'admin';

export interface AccountMenuProps {
  name: string;
  avatarSeed: number;
  role: UserRole;
}

interface MenuItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Role-aware account menu items (Become a host shows for guests only). */
function itemsFor(role: UserRole): MenuItem[] {
  if (role === 'admin') {
    return [{ label: 'Admin dashboard', href: '/admin', icon: 'shield' }];
  }
  if (role === 'host') {
    return [
      { label: 'Host dashboard', href: '/host/dashboard', icon: 'chart' },
      { label: 'View reservations', href: '/guest/dashboard', icon: 'cal' },
    ];
  }
  return [
    { label: 'View reservations', href: '/guest/dashboard', icon: 'cal' },
    { label: 'Become a host', href: '/host/onboarding', icon: 'sparkle' },
  ];
}

/**
 * Avatar button that opens an account dropdown. Closes on outside click /
 * Escape. Log out clears the session via the proxy and returns home.
 */
export function AccountMenu({ name, avatarSeed, role }: AccountMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  async function logout() {
    setOpen(false);
    await fetch('/api/proxy/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/');
    router.refresh();
  }

  const items = itemsFor(role);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
      >
        <Avatar seed={avatarSeed} name={name} size={42} ring />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-[12px] capitalize text-text-3">{role}</p>
          </div>
          <div className="flex flex-col py-1.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Icon name={item.icon} size={16} className="text-gold" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="mt-1 flex items-center gap-3 border-t border-line px-4 py-2.5 text-left text-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Icon name="back" size={16} className="text-text-3" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
