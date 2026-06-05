import { PlaceholderPage } from '@/components/templates/placeholder-page';

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaceholderPage title="Booking Confirmation" route={`/guest/bookings/${id}`} />;
}
