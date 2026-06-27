import type {
  BookingCancelledNotification,
  BookingConfirmedNotification,
  HostApprovedNotification,
  NotificationService,
} from './interfaces.js';
import type { RecipientLookup } from './email-notification.service.js';
import {
  renderBookingCancelled,
  renderBookingConfirmed,
  renderHostApproved,
  type RenderedMessage,
} from './notification-content.js';

export interface ResendConfig {
  apiKey: string;
  from: string;
  /** Demo only: route every email here instead of the real recipient. */
  overrideTo?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Sends booking emails over the Resend HTTP API (port 443), the production path
 * for hosts that block outbound SMTP (e.g. Railway). A drop-in
 * NotificationService: identical content to the SMTP backend (shared builders),
 * only the transport differs. Fire-and-forget — a send failure is logged and
 * swallowed so it can never break a confirmed booking. A 10s timeout guards
 * against a hung request.
 */
export class ResendNotificationService implements NotificationService {
  constructor(
    private readonly config: ResendConfig,
    private readonly lookup: RecipientLookup,
    private readonly log: (payload: Record<string, unknown>, message: string) => void,
  ) {}

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.from,
          to: recipient,
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
      }
      const body = (await res.json().catch(() => null)) as { id?: string } | null;
      this.log(
        { notification: 'email-sent', to, subject: msg.subject, messageId: body?.id },
        `Email sent to ${to}: ${msg.subject}`,
      );
    } catch (err) {
      // Never fail the booking flow on a send error — log and move on.
      this.log(
        { notification: 'email-failed', to, subject: msg.subject, error: (err as Error).message },
        `Email send failed to ${to}: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
