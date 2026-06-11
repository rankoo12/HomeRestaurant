import { LogNotificationService } from '../log-notification.service.js';

describe('LogNotificationService', () => {
  it('emits the booking-confirmed payload a Phase 7 email worker will consume', async () => {
    const lines: Array<{ payload: Record<string, unknown>; message: string }> = [];
    const service = new LogNotificationService((payload, message) =>
      lines.push({ payload, message }),
    );

    await service.bookingConfirmed({
      bookingId: 'b-1',
      confirmationCode: 'HR-TEST22',
      guestId: 'g-1',
      eventTitle: 'Sunday Jollof & Suya Table',
      startsAt: new Date('2026-06-07T22:30:00Z'),
      seats: 2,
      totalCents: 14960,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]!.payload).toMatchObject({
      notification: 'booking-confirmed',
      bookingId: 'b-1',
      confirmationCode: 'HR-TEST22',
      startsAt: '2026-06-07T22:30:00.000Z',
      seats: 2,
      totalCents: 14960,
    });
    expect(lines[0]!.message).toContain('HR-TEST22');
    expect(lines[0]!.message).toContain('Sunday Jollof & Suya Table');
  });
});
