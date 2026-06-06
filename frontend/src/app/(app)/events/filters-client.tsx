'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Chip } from '@/components/atoms';
import { FilterRail } from '@/components/organisms';

const FILTER_GROUPS = [
  { heading: 'Cuisine', items: ['West African', 'Emilian Italian', 'Modern Kaiseki', 'Oaxacan'] },
  { heading: 'Dietary', items: ['Vegetarian friendly', 'Halal options', 'Gluten-free', 'Vegan options'] },
];

const SORTS: Array<{ id: 'soonest' | 'price' | 'top-rated'; label: string }> = [
  { id: 'soonest', label: 'Soonest' },
  { id: 'price', label: 'Price' },
  { id: 'top-rated', label: 'Top rated' },
];

/**
 * Client controls for /events. Drives filters via the URL query string so the
 * page stays a server component and links are shareable. On change, pushes new
 * searchParams and the server re-renders with fresh results.
 */
export function FiltersClient({
  cuisine,
  tags,
  maxPrice,
  sort,
}: {
  cuisine?: string;
  tags: string[];
  maxPrice: number;
  sort: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function pushParam(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    router.push(`/events?${next.toString()}`);
  }

  // FilterRail uses a flat selected map; combine cuisine + tags into it.
  const selected: Record<string, boolean> = {};
  if (cuisine) selected[cuisine] = true;
  for (const t of tags) selected[t] = true;

  const cuisineItems = FILTER_GROUPS[0]!.items;

  function toggle(item: string) {
    pushParam((p) => {
      if (cuisineItems.includes(item)) {
        // single-select cuisine
        if (p.get('cuisine') === item) p.delete('cuisine');
        else p.set('cuisine', item);
      } else {
        const current = new Set((p.get('tags') ?? '').split(',').filter(Boolean));
        if (current.has(item)) current.delete(item);
        else current.add(item);
        if (current.size) p.set('tags', [...current].join(','));
        else p.delete('tags');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Chip
            key={s.id}
            active={sort === s.id}
            onClick={() => pushParam((p) => p.set('sort', s.id))}
          >
            {s.label}
          </Chip>
        ))}
      </div>
      <FilterRail
        groups={FILTER_GROUPS}
        selected={selected}
        onToggle={toggle}
        maxPrice={maxPrice}
        onMaxPriceChange={(v) => pushParam((p) => p.set('maxPrice', String(v)))}
        onClear={() => router.push('/events')}
      />
    </div>
  );
}
