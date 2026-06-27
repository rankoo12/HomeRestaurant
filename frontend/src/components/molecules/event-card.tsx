'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { chefPhoto } from '@/lib/chef-photos';
import { Avatar, Badge, Icon, Price } from '@/components/atoms';
import { FoodImage } from './food-image';
import type { EventCardModel } from '@/components/types';

export interface EventCardProps {
  event: EventCardModel;
  onOpen?: (id: string) => void;
  compact?: boolean;
}

/** Vertical event card used across discovery + chef profiles. */
export function EventCard({ event, onOpen, compact = false }: EventCardProps) {
  const [liked, setLiked] = useState(false);
  const { chef } = event;
  const low = event.seatsLeft <= 3;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(event.id)}
      className="group block w-full overflow-hidden rounded-lg border border-line bg-surface text-left transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-line)]"
    >
      <div className={cn('relative', compact ? 'aspect-[16/10]' : 'aspect-[16/11]')}>
        <FoodImage seed={event.imageSeed} src={event.coverPhoto} alt={event.title} />
        <div className="absolute left-[13px] top-[13px] flex items-center gap-2">
          {low && <Badge tone="soon">Almost full</Badge>}
          {chef.superhost && <Badge tone="gold">Superhost</Badge>}
        </div>
        <span
          role="button"
          tabIndex={-1}
          aria-label={liked ? 'Unsave' : 'Save'}
          onClick={(e) => {
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-[11px] top-[11px] grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm"
        >
          <Icon name="heart" size={17} filled={liked} className={liked ? 'text-terra' : undefined} />
        </span>
        <div className="absolute bottom-[13px] left-[13px] flex items-center gap-[9px]">
          <Avatar seed={chef.avatarSeed} name={chef.name} size={34} src={chefPhoto(chef.slug)} />
          <div className="flex flex-col">
            <span className="whitespace-nowrap text-[13px] font-semibold text-white">{chef.name}</span>
            <span className="text-[11.5px] text-white/70">{event.cuisine}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[9px] px-[17px] pb-[17px] pt-[15px]">
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex items-center gap-[5px] text-[12.5px] text-text-2">
            <Icon name="cal" size={13} /> {event.dateLabel} · {event.timeLabel}
          </span>
          <span className="flex items-center gap-1 text-[12.5px] text-gold">
            <Icon name="star" size={12} filled /> {chef.rating}
          </span>
        </div>
        <h3 className="font-serif text-[19px] leading-tight">{event.title}</h3>
        <span className="flex items-center gap-[5px] text-[12.5px] text-text-3">
          <Icon name="pin" size={13} /> {event.neighborhood}
        </span>
        <div className="my-[3px] h-px bg-line" />
        <div className="flex items-center justify-between">
          <Price value={event.price} />
          <span className={cn('text-[12.5px] font-semibold', low ? 'text-terra' : 'text-text-2')}>
            {event.seatsLeft} seats left
          </span>
        </div>
      </div>
    </button>
  );
}
