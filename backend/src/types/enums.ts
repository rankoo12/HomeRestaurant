import { z } from 'zod';

/**
 * Domain enums — the single source of truth on the TypeScript side, mirroring the
 * Postgres ENUM types from migration 0001. Keep these value sets identical to the DB.
 * See docs/specs/data/01-erd-overview.md.
 */

export const userRole = z.enum(['guest', 'host', 'admin']);
export type UserRole = z.infer<typeof userRole>;

export const eventStatus = z.enum([
  'draft',
  'published',
  'unpublished',
  'cancelled',
  'completed',
]);
export type EventStatus = z.infer<typeof eventStatus>;

export const bookingStatus = z.enum(['pending', 'confirmed', 'cancelled', 'refunded']);
export type BookingStatus = z.infer<typeof bookingStatus>;

export const seatHoldStatus = z.enum(['active', 'consumed', 'released', 'expired']);
export type SeatHoldStatus = z.infer<typeof seatHoldStatus>;

export const verificationStatus = z.enum(['pending', 'approved', 'rejected']);
export type VerificationStatus = z.infer<typeof verificationStatus>;

export const paymentStatus = z.enum(['pending', 'succeeded', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof paymentStatus>;

export const payoutStatus = z.enum(['pending', 'paid', 'failed']);
export type PayoutStatus = z.infer<typeof payoutStatus>;
