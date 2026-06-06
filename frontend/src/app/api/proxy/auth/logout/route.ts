import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl } from '@/lib/auth';

/** Proxy: revoke the refresh token server-side, then clear both cookies. */
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${backendUrl()}/api/auth/logout`, {
      method: 'POST',
      headers: { 'x-refresh-token': refreshToken },
    }).catch(() => undefined); // best-effort; we clear cookies regardless
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
