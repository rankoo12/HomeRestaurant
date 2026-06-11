import { proxyAuthed } from '@/lib/proxy';

/** Proxy: browser → backend Stripe checkout-session creation. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  return proxyAuthed(`/api/bookings/${encodeURIComponent(bookingId)}/checkout-session`, 'POST');
}
