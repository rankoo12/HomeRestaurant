import type { EventListItemDto, ReviewDto } from './api';
import type { EventCardModel, ReviewModel } from '@/components/types';

/**
 * Map backend read DTOs into component view-models. This is the seam that keeps
 * the design system decoupled from the API: money → dollars, ISO → labels.
 */

export function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function toEventCardModel(dto: EventListItemDto): EventCardModel {
  return {
    id: dto.slug, // cards open by slug
    slug: dto.slug,
    title: dto.title,
    cuisine: dto.cuisine,
    neighborhood: dto.neighborhood,
    dateLabel: formatDateLabel(dto.startsAt),
    timeLabel: formatTimeLabel(dto.startsAt),
    price: Math.round(dto.priceCents / 100),
    seatsLeft: dto.seatsLeft,
    seatsTotal: dto.seatsTotal,
    imageSeed: dto.imageSeed,
    coverPhoto: dto.coverPhoto,
    chef: {
      name: dto.chef.name,
      slug: dto.chef.slug,
      cuisine: dto.cuisine,
      rating: dto.chef.rating,
      avatarSeed: dto.chef.avatarSeed,
      superhost: dto.chef.isSuperhost,
    },
  };
}

export function toReviewModel(dto: ReviewDto): ReviewModel {
  return {
    id: dto.id,
    author: dto.author.name,
    avatarSeed: dto.author.avatarSeed,
    rating: dto.rating,
    dateLabel: new Date(dto.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    text: dto.body,
  };
}

export function dollars(cents: number): number {
  return Math.round(cents / 100);
}
