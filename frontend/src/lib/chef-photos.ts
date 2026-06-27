/**
 * Static chef portraits served from frontend/public/chefs/. Seeded chefs get a
 * real, cuisine/identity-matched photo; everyone else falls back to the
 * initials-on-gradient Avatar. Keyed by chef slug.
 */
const CHEF_PHOTOS: Record<string, string> = {
  amara: '/chefs/amara.jpg',
  lucia: '/chefs/lucia.jpg',
  sora: '/chefs/sora.jpg',
  diego: '/chefs/diego.jpg',
};

/** Portrait URL for a chef slug, or null when there's no curated photo. */
export function chefPhoto(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return CHEF_PHOTOS[slug] ?? null;
}
