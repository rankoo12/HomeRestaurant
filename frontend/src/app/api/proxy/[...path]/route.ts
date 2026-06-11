import { NextResponse } from 'next/server';
import { proxyAuthed, type ProxyMethod } from '@/lib/proxy';

/**
 * Authed catch-all proxy for the host/review/admin APIs (Phases 7–8). Explicit
 * proxy routes (auth/*, bookings/*) take precedence over this catch-all;
 * everything else must match the allowlist below — the browser can only reach
 * the backend surfaces we intend it to. The backend still enforces RBAC on
 * every admin route; the allowlist is exposure control, not authorization.
 */
const ALLOWED_PREFIXES = ['host/', 'reviews', 'guest/reviewable', 'admin/'];

function backendPath(segments: string[], search: string): string | null {
  const joined = segments.map(encodeURIComponent).join('/');
  if (!ALLOWED_PREFIXES.some((p) => joined === p || joined.startsWith(p))) return null;
  return `/api/${joined}${search}`;
}

async function handle(request: Request, params: Promise<{ path: string[] }>, method: ProxyMethod) {
  const { path } = await params;
  const url = new URL(request.url);
  const target = backendPath(path, url.search);
  if (!target) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Unknown proxy path' } },
      { status: 404 },
    );
  }
  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();
  return proxyAuthed(target, method, body);
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(request, ctx.params, 'GET');
}
export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(request, ctx.params, 'POST');
}
export async function PUT(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(request, ctx.params, 'PUT');
}
export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(request, ctx.params, 'DELETE');
}
