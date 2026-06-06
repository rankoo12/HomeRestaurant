import { backendUrl } from './auth';

/**
 * Server-side API client for public read pages (React Server Components fetch
 * the backend directly — see docs/specs/discovery/00-index.md). Not for
 * browser use; authed/mutation calls go through /api/proxy.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${backendUrl()}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

// ---- DTOs (mirror the backend read API) -------------------------------------

export interface ChefSummaryDto {
  slug: string;
  name: string;
  avatarSeed: number;
  rating: number;
  isSuperhost: boolean;
}

export interface EventListItemDto {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  neighborhood: string;
  startsAt: string;
  priceCents: number;
  seatsTotal: number;
  seatsLeft: number;
  imageSeed: number;
  chef: ChefSummaryDto;
}

export interface EventListResponse {
  events: EventListItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReviewDto {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  author: { name: string; avatarSeed: number };
}

export interface ChefStatsDto {
  rating: number;
  reviewCount: number;
  dinnersHosted: number;
}

export interface EventDetailDto extends EventListItemDto {
  shortDescription: string;
  durationMinutes: number;
  courses: Array<{ position: number; name: string; description: string }>;
  tags: string[];
  chef: ChefSummaryDto & {
    city: string;
    cuisine: string;
    tagline: string;
    bio: string;
    coverSeed: number;
    hostingSince: number | null;
    verificationStatus: string;
    stats: ChefStatsDto;
    badges: string[];
  };
  reviews: ReviewDto[];
}

export interface ChefProfileDto {
  slug: string;
  name: string;
  avatarSeed: number;
  city: string;
  cuisine: string;
  tagline: string;
  bio: string;
  coverSeed: number;
  isSuperhost: boolean;
  hostingSince: number | null;
  verificationStatus: string;
  badges: string[];
  stats: ChefStatsDto;
  upcomingEvents: EventListItemDto[];
  reviews: ReviewDto[];
}

// ---- Endpoints --------------------------------------------------------------

export interface EventQuery {
  cuisine?: string;
  maxPrice?: number;
  tags?: string[];
  sort?: 'soonest' | 'price' | 'top-rated';
  limit?: number;
  offset?: number;
}

export function listEvents(query: EventQuery = {}): Promise<EventListResponse> {
  const params = new URLSearchParams();
  if (query.cuisine) params.set('cuisine', query.cuisine);
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.tags?.length) params.set('tags', query.tags.join(','));
  if (query.sort) params.set('sort', query.sort);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));
  const qs = params.toString();
  return getJson<EventListResponse>(`/api/events${qs ? `?${qs}` : ''}`);
}

export function getEvent(slug: string): Promise<EventDetailDto> {
  return getJson<EventDetailDto>(`/api/events/${encodeURIComponent(slug)}`);
}

export function getChef(slug: string): Promise<ChefProfileDto> {
  return getJson<ChefProfileDto>(`/api/chefs/${encodeURIComponent(slug)}`);
}
