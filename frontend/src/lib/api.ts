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
  coverPhoto: string | null;
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
  photos: string[];
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

// ---- Booking DTOs (Phase 6 — mirror the booking API) -------------------------

export interface BookingDto {
  id: string;
  eventId: string;
  guestId: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  confirmationCode: string;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingViewDto {
  booking: BookingDto;
  hold: { status: 'active' | 'consumed' | 'released' | 'expired'; expiresAt: string } | null;
  payment: { status: string; failureReason: string | null } | null;
  event: {
    id: string;
    slug: string;
    title: string;
    neighborhood: string;
    startsAt: string;
    priceCents: number;
    imageSeed: number;
    coverPhoto?: string | null;
    addressLine?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

/** Server-side authed read (server components pass the access cookie's token). */
export async function authedGetJson<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${backendUrl()}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
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

export function getBookingView(bookingId: string, accessToken: string): Promise<BookingViewDto> {
  return authedGetJson<BookingViewDto>(
    `/api/bookings/${encodeURIComponent(bookingId)}`,
    accessToken,
  );
}

// ---- Host portal DTOs (Phase 7 — mirror the host APIs) -----------------------

export interface HostEventDto {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  shortDescription: string;
  neighborhood: string;
  status: 'draft' | 'published' | 'unpublished' | 'cancelled' | 'completed';
  startsAt: string;
  durationMinutes: number;
  priceCents: number;
  seatsTotal: number;
  seatsBooked: number;
  imageSeed: number;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photos?: string[]; // present on getOwn (edit)
  coverPhoto?: string | null; // present on listOwn (list)
  liveHeldSeats?: number;
  confirmedBookings?: number;
  courses?: Array<{ position: number; name: string; description: string }>;
  tags?: string[];
}

export interface HostDashboardDto {
  verificationStatus: 'pending' | 'approved' | 'rejected';
  upcomingEvents: number;
  seatsSold: number;
  earningsNetCents: number;
  rating: number;
  nextEvent: HostEventDto | null;
}

export interface OnboardingStateDto {
  profile: {
    slug: string;
    cuisine: string;
    city: string;
    tagline: string;
    bio: string;
    coverSeed: number;
    verificationStatus: 'pending' | 'approved' | 'rejected';
  };
  verifications: Array<{ kind: string; status: string; notes: string | null; createdAt: string }>;
}

export interface RosterEntryDto {
  bookingId: string;
  confirmationCode: string;
  guestName: string;
  avatarSeed: number;
  seats: number;
  dietaryPrefs: string[];
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: string | null;
  totalCents: number;
}

export interface EarningsDto {
  rows: Array<{
    id: string;
    eventTitle: string | null;
    eventStartsAt: string | null;
    confirmationCode: string | null;
    grossCents: number;
    feeCents: number;
    netCents: number;
    status: 'pending' | 'paid' | 'failed';
    createdAt: string;
  }>;
  summary: {
    lifetimeNetCents: number;
    pendingNetCents: number;
    paidNetCents: number;
    feesWithheldCents: number;
  };
}

export interface ReviewableDto {
  reviewable: Array<{ bookingId: string; eventTitle: string; eventSlug: string; startsAt: string }>;
}

export interface GuestBookingDto {
  bookingId: string;
  confirmationCode: string;
  seats: number;
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  totalCents: number;
  eventSlug: string;
  eventTitle: string;
  eventStartsAt: string;
  eventNeighborhood: string;
  eventImageSeed: number;
  chefName: string;
}

export interface GuestBookingsDto {
  upcoming: GuestBookingDto[];
  past: GuestBookingDto[];
}

// ---- Admin portal DTOs (Phase 8 — mirror /api/admin/**) ----------------------

export interface AdminMetricsDto {
  pendingVerifications: number;
  flaggedReviews: number;
  usersByRole: { guest: number; host: number; admin: number };
  bookingsLast30d: number;
  grossRevenueCentsLast30d: number;
  upcomingPublishedEvents: number;
}

export interface AdminVerificationItemDto {
  chefId: string;
  slug: string;
  name: string;
  email: string;
  avatarSeed: number;
  cuisine: string;
  city: string;
  tagline: string;
  bio: string;
  appliedAt: string;
  verifications: Array<{
    id: string;
    kind: string;
    status: 'pending' | 'approved' | 'rejected';
    documentRef: string | null;
    notes: string | null;
    createdAt: string;
  }>;
}

export interface AdminUserDto {
  id: string;
  email: string;
  role: 'guest' | 'host' | 'admin';
  fullName: string;
  avatarSeed: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface AdminUserListDto {
  users: AdminUserDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminPayoutDto {
  id: string;
  chefName: string;
  eventTitle: string | null;
  eventStartsAt: string | null;
  confirmationCode: string | null;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt: string | null;
  createdAt: string;
}

export interface AdminFlaggedReviewDto {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  flaggedAt: string;
  author: { name: string; avatarSeed: number };
  chef: { name: string; slug: string };
  event: { title: string; slug: string; startsAt: string };
}

// ---- Endpoints --------------------------------------------------------------

export interface EventQuery {
  cuisine?: string;
  maxPrice?: number;
  tags?: string[];
  /** Search-bar fields (discovery spec): place text, YYYY-MM-DD, seats wanted. */
  where?: string;
  date?: string;
  minSeats?: number;
  sort?: 'soonest' | 'price' | 'top-rated';
  limit?: number;
  offset?: number;
}

export function listEvents(query: EventQuery = {}): Promise<EventListResponse> {
  const params = new URLSearchParams();
  if (query.cuisine) params.set('cuisine', query.cuisine);
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.tags?.length) params.set('tags', query.tags.join(','));
  if (query.where) params.set('where', query.where);
  if (query.date) params.set('date', query.date);
  if (query.minSeats != null) params.set('minSeats', String(query.minSeats));
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
