/**
 * Notifications contract (booking confirmations; host/guest messaging is
 * Phase 7). Interface-first so the booking/payments flows depend on the seam,
 * not a delivery mechanism. Phase 6 ships a log-backed implementation —
 * real email delivery (SMTP/provider + BullMQ worker) is Phase 7 infra; see
 * docs/known-issues/phase-6-deferrals.md.
 */
export interface BookingConfirmedNotification {
  bookingId: string;
  confirmationCode: string;
  guestId: string;
  eventTitle: string;
  startsAt: Date;
  seats: number;
  totalCents: number;
  /** Exact address — included now that the booking is confirmed. */
  addressLine: string | null;
}

export interface BookingCancelledNotification {
  bookingId: string;
  guestId: string;
  eventTitle: string;
  refunded: boolean;
}

export interface HostApprovedNotification {
  hostId: string;
  hostName: string;
  chefSlug: string;
}

export interface NotificationService {
  /** Fire-and-forget: callers must never fail a booking flow on notify errors. */
  bookingConfirmed(input: BookingConfirmedNotification): Promise<void>;
  /** Host cancelled the event (events spec §3). Fire-and-forget. */
  bookingCancelled(input: BookingCancelledNotification): Promise<void>;
  /** Host application approved by an admin. Fire-and-forget. */
  hostApproved(input: HostApprovedNotification): Promise<void>;
}
