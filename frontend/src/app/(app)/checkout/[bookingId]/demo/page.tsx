import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, getBookingView } from '@/lib/api';
import { DemoPayClient } from './demo-pay-client';

export const dynamic = 'force-dynamic';

/**
 * Demo "hosted checkout" page — stands in for Stripe's hosted page when
 * PAYMENTS_DEMO_MODE is on. Shows the order total with Pay / Decline buttons
 * that drive the real confirmation webhook path. No real charge.
 */
export default async function DemoCheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');

  let view;
  try {
    view = await getBookingView(bookingId, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect('/login');
    throw err;
  }

  return <DemoPayClient view={view} />;
}
