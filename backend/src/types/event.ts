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
  courses?: Array<Omit<EventCourse, 'id' | 'eventId'>>;
  tags?: string[];
}
