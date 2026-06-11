import type {
  BookingCancelledNotification,
  BookingConfirmedNotification,
  NotificationService,
} from './interfaces.js';

type LogFn = (payload: Record<string, unknown>, message: string) => void;

/**
 * Phase 6 implementation: emits the confirmation as a structured log line —
 * the exact payload a Phase 7 email worker will consume. Swap this for the
 * real sender without touching the booking/payments flows.
 */
export class LogNotificationService implements NotificationService {
  constructor(private readonly log: LogFn) {}

  async bookingConfirmed(input: BookingConfirmedNotification): Promise<void> {
    this.log(
      {
        notification: 'booking-confirmed',
        bookingId: input.bookingId,
        confirmationCode: input.confirmationCode,
        guestId: input.guestId,
        eventTitle: input.eventTitle,
        startsAt: input.startsAt.toISOString(),
        seats: input.seats,
        totalCents: input.totalCents,
      },
      `Booking confirmed: ${input.confirmationCode} — ${input.seats} seat(s) for "${input.eventTitle}"`,
    );
  }

  async bookingCancelled(input: BookingCancelledNotification): Promise<void> {
    this.log(
      {
        notification: 'booking-cancelled',
        bookingId: input.bookingId,
        guestId: input.guestId,
        eventTitle: input.eventTitle,
        refunded: input.refunded,
      },
      `Booking cancelled by host: "${input.eventTitle}"${input.refunded ? ' (refunded)' : ''}`,
    );
  }
}
