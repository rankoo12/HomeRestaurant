import type { EventStatus } from './enums.js';

/** A dining event. Mirrors `events`. Money in integer cents. */
export interface Event {
  id: string;
  slug: string;
  chefId: string;
  title: string;
  cuisine: string;
  shortDescription: string;
  neighborhood: string;
  status: EventStatus;
  /** Public area label (e.g. "Bed-Stuy, Brooklyn"). Safe to show anyone. */
  // (neighborhood already declared above)
  /** Exact address — sensitive; revealed only to a booked guest/host/admin. */
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  startsAt: Date;
  durationMinutes: number;
  priceCents: number;
  seatsTotal: number;
  seatsBooked: number;
  imageSeed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCourse {
  id: string;
  eventId: string;
  position: number;
  name: string;
  description: string;
}

export interface EventTag {
  id: string;
  eventId: string;
  label: string;
}

/** An event with its menu + tags — the detail-screen shape. */
export interface EventWithDetails extends Event {
  courses: EventCourse[];
  tags: string[];
  /** Gallery photos (base64 data URLs), cover first. At least one. */
  photos: string[];
}

export interface NewEvent {
  slug: string;
  chefId: string;
  title: string;
  cuisine: string;
  shortDescription: string;
  neighborhood: string;
  status?: EventStatus;
  startsAt: Date;
  durationMinutes: number;
  priceCents: number;
  seatsTotal: number;
  seatsBooked?: number;
  imageSeed?: number;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Gallery photos (base64 data URLs), cover first. At least one required. */
  photos?: string[];
  courses?: Array<Omit<EventCourse, 'id' | 'eventId'>>;
  tags?: string[];
}
