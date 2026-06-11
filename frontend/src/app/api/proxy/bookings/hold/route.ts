import { proxyAuthed } from '@/lib/proxy';

/** Proxy: browser → backend hold creation (start checkout). */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyAuthed('/api/bookings/hold', 'POST', body);
}
