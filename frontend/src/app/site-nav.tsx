import { Nav, type NavLink } from '@/components/organisms';
import { getCurrentUser } from '@/lib/session';

/**
 * Session-aware Nav (app layer — the organism stays presentational). Every
 * page renders this instead of raw `Nav`, so a logged-in user sees their
 * account menu everywhere, not just inside their portal.
 */
export async function SiteNav({ links }: { links?: NavLink[] }) {
  const user = await getCurrentUser();
  return (
    <Nav
      links={links}
      user={
        user
          ? { name: user.fullName, avatarSeed: user.avatarSeed, role: user.role }
          : null
      }
    />
  );
}
