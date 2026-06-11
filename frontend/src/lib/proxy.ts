import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, backendUrl } from './auth';

export type ProxyMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Shared helper for authed proxy route handlers: forwards the request to the
 * backend with the access token from the httpOnly cookie as a Bearer header.
 * The browser never sees raw tokens (see docs/specs/identity/02-token-and-session.md);
 * booking/payment mutations all flow through here.
 */
export async function proxyAuthed(
  path: string,
  method: ProxyMethod,
  body?: string,
): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Please log in.' } },
      { status: 401 },
    );
  }

  const res = await fetch(`${backendUrl()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body,
    cache: 'no-store',
  });
  // 204 (e.g. admin review removal) carries no body — and must not be given one.
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = (await res.json().catch(() => null)) ?? {
    error: { code: 'INTERNAL', message: 'Unexpected response' },
  };
  return NextResponse.json(data, { status: res.status });
}
