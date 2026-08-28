/**
 * Email provider abstraction.
 *
 * The first version never transmits a message. The "log" provider records what
 * would have been sent and returns a LOGGED_ONLY delivery status. Adding a real
 * provider means implementing this interface and setting EMAIL_PROVIDER.
 */
import type { DeliveryStatus } from '@prisma/client';

export interface OutboundEmail {
  to: string;
  toName: string;
  subject: string;
  body: string;
  replyTo?: string;
  /** Appended to the body by the caller; kept explicit so it is never dropped. */
  complianceFooter: string;
}

export interface SendResult {
  status: DeliveryStatus;
  providerId: string | null;
  message: string;
}

export interface EmailProvider {
  readonly name: string;
  readonly canSend: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
}

/** Records the message without transmitting it. */
export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';
  readonly canSend = false;

  async send(email: OutboundEmail): Promise<SendResult> {
    return {
      status: 'LOGGED_ONLY',
      providerId: null,
      message: `Logged only. No email was transmitted to ${email.to}. Set EMAIL_PROVIDER to a real provider to send.`,
    };
  }
}

export function getEmailProvider(): EmailProvider {
  // Additional providers register here. Until one is configured, nothing sends.
  return new LogEmailProvider();
}

/** The footer appended to every outbound email. */
export function complianceFooter(options: {
  agencyName: string;
  agencyAddress: string;
  privacyUrl: string;
  unsubscribeUrl: string;
  clientBrand: string;
}): string {
  return [
    '',
    '---',
    `You are receiving this message from ${options.agencyName} on behalf of ${options.clientBrand}, because your professional role suggests this topic is relevant to your work.`,
    `Postal address: ${options.agencyAddress}`,
    `Privacy notice: ${options.privacyUrl}`,
    `To stop receiving these messages, reply with "unsubscribe" or use this link: ${options.unsubscribeUrl}`,
  ].join('\n');
}
