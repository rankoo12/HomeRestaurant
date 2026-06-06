import { Icon } from '@/components/atoms';

export interface FilterGroup {
  heading: string;
  items: string[];
}

export interface FilterRailProps {
  groups: FilterGroup[];
  selected: Record<string, boolean>;
  onToggle: (item: string) => void;
  maxPrice: number;
  onMaxPriceChange: (value: number) => void;
  onClear: () => void;
  priceMin?: number;
  priceMax?: number;
}

/** Discovery filter sidebar. Fully controlled via props. */
export function FilterRail({
  groups,
  selected,
  onToggle,
  maxPrice,
  onMaxPriceChange,
  onClear,
  priceMin = 40,
  priceMax = 160,
}: FilterRailProps) {
  return (
    <aside className="flex flex-col gap-[26px] self-start">
      <div className="flex flex-col gap-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Filters</span>
          <button type="button" onClick={onClear} className="text-[12.5px] text-text-3 hover:text-text">
            Clear all
          </button>
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="max-price" className="text-[12.5px] font-semibold text-text-2">
            Max price · <span className="text-gold">${maxPrice}/seat</span>
          </label>
          <input
            id="max-price"
            type="range"
            min={priceMin}
            max={priceMax}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            className="accent-gold"
          />
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-3">
          <div className="h-px bg-line" />
          <span className="text-[13.5px] font-bold">{group.heading}</span>
          <div className="flex flex-col gap-[9px]">
            {group.items.map((item) => {
              const on = !!selected[item];
              return (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2.5 text-[13.5px]"
                  style={{ color: on ? 'var(--text)' : 'var(--text-2)' }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(item)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] border text-on-gold"
                    style={{
                      borderColor: on ? 'var(--gold)' : 'var(--line-strong)',
                      background: on ? 'var(--gold)' : 'transparent',
                    }}
                  >
                    {on && <Icon name="check" size={13} stroke={2.5} />}
                  </span>
                  {item}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
