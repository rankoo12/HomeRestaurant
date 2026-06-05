import type { BookingStatus, SeatHoldStatus } from './enums.js';

/** A guest's reservation. Mirrors `bookings`. */
export interface Booking {
  id: string;
  eventId: string;
  guestId: string;
  seats: number;
  status: BookingStatus;
  confirmationCode: string;
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A transient seat reservation during checkout. Mirrors `seat_holds`. */
export interface SeatHold {
  id: string;
  eventId: string;
  guestId: string;
  seats: number;
  status: SeatHoldStatus;
  expiresAt: Date;
  bookingId: string | null;
  createdAt: Date;
}

export interface NewBooking {
  eventId: string;
  guestId: string;
  seats: number;
  status?: BookingStatus;
  confirmationCode: string;
  totalCents: number;
}
