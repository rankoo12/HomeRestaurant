import { PlaceholderPage } from '@/components/templates/placeholder-page';

export default async function ChefProfilePage({ params }: { params: Promise<{ chefId: string }> }) {
  const { chefId } = await params;
  return <PlaceholderPage title="Chef Profile" route={`/chefs/${chefId}`} />;
}
