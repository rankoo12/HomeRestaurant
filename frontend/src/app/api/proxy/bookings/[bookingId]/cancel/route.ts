import { proxyAuthed } from '@/lib/proxy';

/** Proxy: browser → backend booking cancel (abandon checkout pre-payment). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  return proxyAuthed(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, 'POST');
}
