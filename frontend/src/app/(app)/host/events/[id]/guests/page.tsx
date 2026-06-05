import { PlaceholderPage } from '@/components/templates/placeholder-page';

export default async function GuestManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaceholderPage title="Guest Management" route={`/host/events/${id}/guests`} />;
}
