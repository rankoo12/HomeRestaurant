import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  backendUrl,
  cookieBase,
} from '@/lib/auth';

/**
 * Proxy: rotate the session from the httpOnly refresh cookie. Used after the
 * onboarding role upgrade so the new `host` role lands in the JWT without a
 * re-login (chef-onboarding spec §4, approved scope decision).
 */
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: 'INVALID_REFRESH', message: 'No session' } },
      { status: 401 },
    );
  }

  const res = await fetch(`${backendUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    const response = NextResponse.json(data, { status: res.status });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, data.accessToken, { ...cookieBase(), maxAge: ACCESS_MAX_AGE });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...cookieBase(),
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
