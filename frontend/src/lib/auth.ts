/**
 * Server-side auth helpers for the Next.js proxy layer. The browser never sees
 * raw tokens — they live in httpOnly cookies the proxy sets/reads. These
 * helpers must only be imported from server code (route handlers / server
 * components). See docs/specs/identity/02-token-and-session.md.
 */

export const ACCESS_COOKIE = 'hr_access';
export const REFRESH_COOKIE = 'hr_refresh';

/** Backend base URL (server-side only; never exposed to the browser). */
export function backendUrl(): string {
  return process.env.BACKEND_API_URL ?? 'http://localhost:4000';
}

export const ACCESS_MAX_AGE = 15 * 60; // 15 min
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/** Cookie options shared by both tokens. Secure only in production. */
export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: 'guest' | 'host' | 'admin';
  fullName: string;
  phone: string | null;
  dietaryPrefs: string[];
  avatarSeed: number;
  isSuspended: boolean;
}

import { NextResponse } from 'next/server';

/**
 * Forward a register/login request to the backend; on success translate the
 * returned tokens into httpOnly cookies and return only the safe user.
 * Shared by the login and register proxy routes (DRY).
 */
export async function proxyAuthAndSetCookies(
  path: '/api/auth/login' | '/api/auth/register',
  body: string,
  okStatus: number,
): Promise<NextResponse> {
  const res = await fetch(`${backendUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ user: data.user }, { status: okStatus });
  response.cookies.set(ACCESS_COOKIE, data.accessToken, { ...cookieBase(), maxAge: ACCESS_MAX_AGE });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...cookieBase(),
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
