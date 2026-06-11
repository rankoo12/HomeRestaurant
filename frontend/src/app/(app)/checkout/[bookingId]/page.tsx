import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Footer } from '@/components/organisms';
import { SiteNav } from '@/app/site-nav';
import { ACCESS_COOKIE } from '@/lib/auth';
import { ApiError, getBookingView } from '@/lib/api';
import { CheckoutClient } from './checkout-client';

export const dynamic = 'force-dynamic';

/**
 * Checkout — guest count summary + payment hand-off to Stripe's hosted page.
 * The seat hold's countdown, Payment-Failed and hold-expired states live in
 * the client component. See docs/specs/payments.md §4/§7.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { bookingId } = await params;
  const { cancelled } = await searchParams;

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

  return (
    <>
      <SiteNav links={[{ href: '/events', label: 'Browse' }]} />
      <div className="mx-auto w-full max-w-[680px] px-8 pb-20 pt-10">
        <CheckoutClient initialView={view} paymentCancelled={cancelled === '1'} />
      </div>
      <Footer />
    </>
  );
}
