import { PlaceholderPage } from '@/components/templates/placeholder-page';

export default async function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <PlaceholderPage title="Checkout" route={`/checkout/${bookingId}`} />;
}
