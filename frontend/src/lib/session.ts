import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl } from './auth';
import type { SafeUser } from './auth';

/**
 * Server-side session read for server components / layouts. Reads the access
 * cookie and asks the backend who the user is. Returns null when unauthenticated.
 *
 * Note: this is a read-only check. It does NOT mutate cookies (server components
 * can't set them), so it can't perform a transparent refresh — that happens in
 * the proxy route handlers. If the access token is expired, the user is treated
 * as logged-out here and the client re-auths via the refresh route.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${backendUrl()}/api/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: SafeUser };
    return data.user;
  } catch {
    return null;
  }
}

/** Roles allowed in each authenticated area, mirroring docs/specs/identity/03-rbac.md. */
export function isRoleAllowed(role: SafeUser['role'], area: 'guest' | 'host' | 'admin'): boolean {
  if (area === 'guest') return true; // any authenticated user
  if (area === 'host') return role === 'host' || role === 'admin';
  return role === 'admin';
}

/**
 * Guard for a protected area's layout. Redirects unauthenticated users to
 * /login, and wrong-role users to /403. Returns the user when allowed.
 */
export async function requireArea(area: 'guest' | 'host' | 'admin'): Promise<SafeUser> {
  const { redirect } = await import('next/navigation');
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
    throw new Error('unreachable'); // redirect() throws; satisfies the type narrower
  }
  if (!isRoleAllowed(user.role, area)) {
    redirect('/403');
    throw new Error('unreachable');
  }
  return user;
}

export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
