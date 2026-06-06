import { proxyAuthAndSetCookies } from '@/lib/auth';

/** Proxy: browser → backend register; stores tokens as httpOnly cookies. */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyAuthAndSetCookies('/api/auth/register', body, 201);
}
