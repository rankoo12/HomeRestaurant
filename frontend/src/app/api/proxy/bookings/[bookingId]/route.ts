import { proxyAuthed } from '@/lib/proxy';

/** Proxy: browser → backend booking view (checkout/confirmation polling). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  return proxyAuthed(`/api/bookings/${encodeURIComponent(bookingId)}`, 'GET');
}
