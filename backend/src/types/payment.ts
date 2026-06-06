import type { PaymentStatus, PayoutStatus } from './enums.js';

/** A charge against a booking (1:1). Mirrors `payments`. */
export interface Payment {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Money owed/sent to a chef, net of fee. Mirrors `payouts`. */
export interface Payout {
  id: string;
  chefId: string;
  bookingId: string | null;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: PayoutStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPayout {
  chefId: string;
  bookingId?: string | null;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status?: PayoutStatus;
  paidAt?: Date | null;
}
