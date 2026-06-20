import { proxyAuthed } from '@/lib/proxy';

/** Proxy: browser → backend demo-pay (simulate paying/declining; demo mode only). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const body = await request.text();
  return proxyAuthed(`/api/bookings/${encodeURIComponent(bookingId)}/demo-pay`, 'POST', body);
}
