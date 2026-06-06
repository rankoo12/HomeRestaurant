import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Avatar, Button, Logo, ThemeToggle } from '@/components/atoms';

export interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface NavProps {
  links?: NavLink[];
  /** When provided, shows the avatar; otherwise shows Log in / Sign up. */
  user?: { name: string; avatarSeed: number } | null;
}

/** Sticky top navigation. Presentational — links + auth state passed in. */
export function Nav({ links = [], user = null }: NavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--nav-bg)] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-[22px] px-8">
        <Link href="/" aria-label="Home Restaurant — home">
          <Logo size={20} />
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1.5">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                'relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                l.active ? 'text-text' : 'text-text-2 hover:text-text',
              )}
            >
              {l.label}
              {l.active && (
                <span className="absolute inset-x-3.5 bottom-0 h-0.5 rounded bg-gold" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Link href="/guest/dashboard" aria-label="Your account">
              <Avatar seed={user.avatarSeed} name={user.name} size={42} ring />
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
