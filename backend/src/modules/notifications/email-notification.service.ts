import nodemailer, { type Transporter } from 'nodemailer';
import type {
  BookingCancelledNotification,
  BookingConfirmedNotification,
  HostApprovedNotification,
  NotificationService,
} from './interfaces.js';

/** Resolve a user's email + display name by id (kept narrow — no repo coupling). */
export type RecipientLookup = (
  userId: string,
) => Promise<{ email: string; fullName: string } | null>;

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  /** Demo only: route every email here instead of the real recipient. */
  overrideTo?: string;
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

/**
 * Sends booking emails over SMTP via nodemailer. A drop-in NotificationService:
 * the booking/payments flows depend only on the interface. Fire-and-forget —
 * a send failure is logged and swallowed so it can never break a confirmed
 * booking. Recipient address is resolved from the guest id at send time.
 */
export class EmailNotificationService implements NotificationService {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: EmailConfig,
    private readonly lookup: RecipientLookup,
    private readonly log: (payload: Record<string, unknown>, message: string) => void,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async bookingConfirmed(input: BookingConfirmedNotification): Promise<void> {
    const to = await this.lookup(input.guestId);
    if (!to) return;
    const subject = `You're booked — ${input.eventTitle} (${input.confirmationCode})`;
    const greeting = to.fullName ? `Hi ${to.fullName.split(' ')[0]},` : 'Hi there,';
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

    await this.send(to.email, subject, text, this.confirmedHtml(input, greeting));
  }

  async bookingCancelled(input: BookingCancelledNotification): Promise<void> {
    const to = await this.lookup(input.guestId);
    if (!to) return;
    const subject = `Cancelled — ${input.eventTitle}`;
    const refundLine = input.refunded
      ? `You've been refunded in full; it may take a few days to appear.`
      : `No charge was made.`;
    const text = [
      to.fullName ? `Hi ${to.fullName.split(' ')[0]},` : 'Hi there,',
      ``,
      `We're sorry — the host cancelled "${input.eventTitle}". ${refundLine}`,
      ``,
      `There are plenty more dinners to discover.`,
      ``,
      `— Ratatouille`,
    ].join('\n');

    await this.send(to.email, subject, text);
  }

  async hostApproved(input: HostApprovedNotification): Promise<void> {
    const to = await this.lookup(input.hostId);
    if (!to) return;
    const greeting = to.fullName ? `Hi ${to.fullName.split(' ')[0]},` : 'Hi there,';
    const subject = `You're a verified host on Ratatouille! 🎉`;
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
    await this.send(to.email, subject, text, html);
  }

  private async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    const recipient = this.config.overrideTo ?? to;
    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: recipient,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      this.log(
        { notification: 'email-sent', to, subject, messageId: info.messageId },
        `Email sent to ${to}: ${subject}`,
      );
    } catch (err) {
      // Never fail the booking flow on a send error — log and move on.
      this.log(
        { notification: 'email-failed', to, subject, error: (err as Error).message },
        `Email send failed to ${to}: ${(err as Error).message}`,
      );
    }
  }

  private confirmedHtml(input: BookingConfirmedNotification, greeting: string): string {
    return `
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
  }
}
