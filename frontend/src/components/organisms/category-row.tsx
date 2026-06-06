import { Chip } from '@/components/atoms';
import type { CategoryModel } from '@/components/types';

export interface CategoryRowProps {
  categories: CategoryModel[];
  active: string;
  onChange: (id: string) => void;
}

/** Horizontal category chip selector. */
export function CategoryRow({ categories, active, onChange }: CategoryRowProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {categories.map((c) => (
        <Chip key={c.id} active={active === c.id} onClick={() => onChange(c.id)}>
          {c.label}
        </Chip>
      ))}
    </div>
  );
}
