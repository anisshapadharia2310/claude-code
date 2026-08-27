import { DeliveryStatus } from '@prisma/client';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  /** Appended to every message; never optional. */
  complianceFooter: string;
}

export interface SendResult {
  status: DeliveryStatus;
  provider: string;
  message: string;
  providerMessageId?: string;
}

export interface EmailProvider {
  readonly name: string;
  /** True when the provider actually transmits mail. */
  readonly transmits: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
}

/**
 * The default provider. The first version of SIGNAL never sends real email: it
 * records the message so the activity history and engagement scoring are
 * complete, and leaves transmission to a provider added later.
 */
export const logOnlyEmailProvider: EmailProvider = {
  name: 'log',
  transmits: false,
  async send(): Promise<SendResult> {
    return {
      status: DeliveryStatus.LOGGED_MANUALLY,
      provider: 'log',
      message:
        'Recorded in SIGNAL only. No email provider is connected, so nothing was transmitted.',
    };
  },
};

/**
 * Resolves the configured provider. Adding a real provider means implementing
 * EmailProvider and registering it here - no caller changes.
 */
export function getEmailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
    case 'log':
    case undefined:
    case '':
      return logOnlyEmailProvider;
    default:
      // A provider name is configured but no adapter is registered yet. Fail
      // safe by logging rather than silently pretending to send.
      return logOnlyEmailProvider;
  }
}

export function complianceFooter(): string {
  const company = process.env.COMPLIANCE_FOOTER_COMPANY ?? 'Your agency';
  const address = process.env.COMPLIANCE_FOOTER_ADDRESS ?? 'Your registered address';
  return [
    '---',
    `${company}, ${address}.`,
    'You are receiving this message because we believe this topic is relevant to your professional role.',
    'If you would prefer not to hear from us, reply with "unsubscribe" and we will remove you immediately.',
  ].join('\n');
}
