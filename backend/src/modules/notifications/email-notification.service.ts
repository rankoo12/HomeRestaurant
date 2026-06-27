import nodemailer, { type Transporter } from 'nodemailer';
import type {
  BookingCancelledNotification,
  BookingConfirmedNotification,
  HostApprovedNotification,
  NotificationService,
} from './interfaces.js';
import {
  renderBookingCancelled,
  renderBookingConfirmed,
  renderHostApproved,
  type RenderedMessage,
} from './notification-content.js';

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

/**
 * Sends booking emails over SMTP via nodemailer. A drop-in NotificationService:
 * the booking/payments flows depend only on the interface. Fire-and-forget —
 * a send failure is logged and swallowed so it can never break a confirmed
 * booking. Recipient address is resolved from the guest id at send time.
 *
 * Note: many PaaS hosts (e.g. Railway) block outbound SMTP; for those use
 * ResendNotificationService (HTTP API) instead. Content is identical — both
 * render from the shared notification-content builders.
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
      // Fail fast on a blocked/slow SMTP path (some PaaS networks throttle
      // outbound SMTP) instead of hanging for the OS default. Sends are
      // fire-and-forget, so a timeout just logs and moves on.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async bookingConfirmed(input: BookingConfirmedNotification): Promise<void> {
    const to = await this.lookup(input.guestId);
    if (!to) return;
    await this.send(to.email, renderBookingConfirmed(input, to.fullName));
  }

  async bookingCancelled(input: BookingCancelledNotification): Promise<void> {
    const to = await this.lookup(input.guestId);
    if (!to) return;
    await this.send(to.email, renderBookingCancelled(input, to.fullName));
  }

  async hostApproved(input: HostApprovedNotification): Promise<void> {
    const to = await this.lookup(input.hostId);
    if (!to) return;
    await this.send(to.email, renderHostApproved(input, to.fullName));
  }

  private async send(to: string, msg: RenderedMessage): Promise<void> {
    const recipient = this.config.overrideTo ?? to;
    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: recipient,
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      });
      this.log(
        { notification: 'email-sent', to, subject: msg.subject, messageId: info.messageId },
        `Email sent to ${to}: ${msg.subject}`,
      );
    } catch (err) {
      // Never fail the booking flow on a send error — log and move on.
      this.log(
        { notification: 'email-failed', to, subject: msg.subject, error: (err as Error).message },
        `Email send failed to ${to}: ${(err as Error).message}`,
      );
    }
  }
}
