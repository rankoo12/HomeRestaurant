import type {
  BookingCancelledNotification,
  BookingConfirmedNotification,
  HostApprovedNotification,
} from './interfaces.js';

/**
 * Shared message builders for the notification services. Both the SMTP
 * (EmailNotificationService) and HTTP (ResendNotificationService) backends
 * render identical content from these — the delivery mechanism is the only
 * difference. Pure functions, no I/O.
 */

export interface RenderedMessage {
  subject: string;
  text: string;
  html?: string;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function greet(fullName: string): string {
  return fullName ? `Hi ${fullName.split(' ')[0]},` : 'Hi there,';
}

export function renderBookingConfirmed(
  input: BookingConfirmedNotification,
  fullName: string,
): RenderedMessage {
  const greeting = greet(fullName);
  const subject = `You're booked — ${input.eventTitle} (${input.confirmationCode})`;
  const text = [
    greeting,
    ``,
    `Your seat is confirmed. Here are the details:`,
    ``,
    `  Dinner:       ${input.eventTitle}`,
    `  When:         ${formatDate(input.startsAt)}`,
    ...(input.addressLine ? [`  Address:      ${input.addressLine}`] : []),
    `  Seats:        ${input.seats}`,
    `  Total paid:   ${formatMoney(input.totalCents)}`,
    `  Confirmation: ${input.confirmationCode}`,
    ``,
    `Bring your appetite. See you at the table!`,
    ``,
    `— Ratatouille`,
  ].join('\n');

  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#2C1F13">
      <h1 style="font-size:24px;color:#C25A33;margin:0 0 8px">You're booked!</h1>
      <p style="font-family:system-ui,sans-serif;font-size:14px">${greeting}</p>
      <p style="font-family:system-ui,sans-serif;font-size:14px">Your seat is confirmed.</p>
      <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;color:#6C5740">Dinner</td><td style="padding:6px 0;text-align:right"><b>${input.eventTitle}</b></td></tr>
        <tr><td style="padding:6px 0;color:#6C5740">When</td><td style="padding:6px 0;text-align:right">${formatDate(input.startsAt)}</td></tr>
        ${input.addressLine ? `<tr><td style="padding:6px 0;color:#6C5740">Address</td><td style="padding:6px 0;text-align:right">${input.addressLine}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#6C5740">Seats</td><td style="padding:6px 0;text-align:right">${input.seats}</td></tr>
        <tr><td style="padding:6px 0;color:#6C5740">Total paid</td><td style="padding:6px 0;text-align:right">${formatMoney(input.totalCents)}</td></tr>
        <tr><td style="padding:6px 0;color:#6C5740">Confirmation</td><td style="padding:6px 0;text-align:right"><b>${input.confirmationCode}</b></td></tr>
      </table>
      <p style="font-family:system-ui,sans-serif;font-size:14px;color:#6C5740">Bring your appetite. See you at the table!</p>
      <p style="font-family:Georgia,serif;color:#A23F1C">— Ratatouille</p>
    </div>`;

  return { subject, text, html };
}

export function renderBookingCancelled(
  input: BookingCancelledNotification,
  fullName: string,
): RenderedMessage {
  const refundLine = input.refunded
    ? `You've been refunded in full; it may take a few days to appear.`
    : `No charge was made.`;
  const text = [
    greet(fullName),
    ``,
    `We're sorry — the host cancelled "${input.eventTitle}". ${refundLine}`,
    ``,
    `There are plenty more dinners to discover.`,
    ``,
    `— Ratatouille`,
  ].join('\n');

  return { subject: `Cancelled — ${input.eventTitle}`, text };
}

export function renderHostApproved(
  input: HostApprovedNotification,
  fullName: string,
): RenderedMessage {
  const greeting = greet(fullName);
  const text = [
    greeting,
    ``,
    `Great news — your host application has been approved. You're now a verified`,
    `chef on Ratatouille and can publish dinners for guests to book.`,
    ``,
    `Your public chef page: /chefs/${input.chefSlug}`,
    ``,
    `Head to your host dashboard to create and publish your first dinner.`,
    ``,
    `Anyone can cook — now go show them how.`,
    ``,
    `— Ratatouille`,
  ].join('\n');
  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#2C1F13">
      <h1 style="font-size:24px;color:#C25A33;margin:0 0 8px">You're a verified host! 🎉</h1>
      <p style="font-family:system-ui,sans-serif;font-size:14px">${greeting}</p>
      <p style="font-family:system-ui,sans-serif;font-size:14px">
        Your application has been approved — you can now publish dinners for guests to book.
      </p>
      <p style="font-family:system-ui,sans-serif;font-size:14px;color:#6C5740">
        Your public chef page: <b>/chefs/${input.chefSlug}</b>
      </p>
      <p style="font-family:system-ui,sans-serif;font-size:14px">Anyone can cook — now go show them how.</p>
      <p style="font-family:Georgia,serif;color:#A23F1C">— Ratatouille</p>
    </div>`;

  return { subject: `You're a verified host on Ratatouille! 🎉`, text, html };
}
