import { Nav, type NavLink } from '@/components/organisms';
import { getCurrentUser } from '@/lib/session';

/** The avatar links to the portal that matches the viewer's role. */
const ACCOUNT_HOME: Record<'guest' | 'host' | 'admin', string> = {
  guest: '/guest/dashboard',
  host: '/host/dashboard',
  admin: '/admin',
};

/**
 * Session-aware Nav (app layer — the organism stays presentational). Every
 * page renders this instead of raw `Nav`, so a logged-in user sees their
 * avatar everywhere, not just inside their portal.
 */
export async function SiteNav({ links }: { links?: NavLink[] }) {
  const user = await getCurrentUser();
  return (
    <Nav
      links={links}
      user={user ? { name: user.fullName, avatarSeed: user.avatarSeed } : null}
      accountHref={user ? ACCOUNT_HOME[user.role] : undefined}
    />
  );
}
