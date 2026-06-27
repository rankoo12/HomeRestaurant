'use client';

import { cn } from '@/lib/cn';
import { chefPhoto } from '@/lib/chef-photos';
import { Avatar, Button, Icon, Price, Stars } from '@/components/atoms';
import { FoodImage } from './food-image';
import type { EventCardModel } from '@/components/types';

export interface EventFeatureProps {
  event: EventCardModel;
  onOpen?: (id: string) => void;
  reverse?: boolean;
}

/** Wide editorial feature row (landing page highlight). */
export function EventFeature({ event, onOpen, reverse = false }: EventFeatureProps) {
  const { chef } = event;
  return (
    <div className="grid min-h-[300px] overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-2">
      <div className={cn('relative min-h-[220px]', reverse ? 'md:order-2' : 'md:order-1')}>
        <FoodImage seed={event.imageSeed} src={event.coverPhoto} alt={event.title} />
      </div>
      <div
        className={cn(
          'flex flex-col justify-center gap-4 p-9',
          reverse ? 'md:order-1' : 'md:order-2',
        )}
      >
        <div className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-gold">
          {event.cuisine}
        </div>
        <h3 className="font-serif text-[30px] leading-tight">{event.title}</h3>
        {event.short && <p className="text-[14.5px] leading-relaxed text-text-2">{event.short}</p>}
        <div className="flex items-center gap-[11px]">
          <Avatar seed={chef.avatarSeed} name={chef.name} size={40} src={chefPhoto(chef.slug)} />
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
              {chef.name}
              <Icon name="shield" size={13} stroke={1.8} className="text-sage" />
            </span>
            <span className="flex items-center gap-1 text-[12.5px] text-text-2">
              <Stars value={chef.rating} size={12} /> {chef.rating}
              {chef.reviews != null && <> · {chef.reviews} reviews</>}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Price value={event.price} big />
            <span className="text-[12.5px] text-text-3">
              {event.dateLabel} · {event.timeLabel}
            </span>
          </div>
          <Button onClick={() => onOpen?.(event.id)}>
            Reserve a seat <Icon name="arrow" size={17} />
          </Button>
        </div>
      </div>
    </div>
  );
}
