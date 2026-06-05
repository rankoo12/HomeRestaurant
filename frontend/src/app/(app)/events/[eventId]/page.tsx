import { PlaceholderPage } from '@/components/templates/placeholder-page';

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <PlaceholderPage title="Event Details" route={`/events/${eventId}`} />;
}
