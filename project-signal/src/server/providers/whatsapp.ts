/**
 * WhatsApp provider abstraction.
 *
 * As with email, nothing is transmitted in the first version. A future WhatsApp
 * Business API integration implements this interface; the compliance checks
 * that gate it live in the domain layer and are unaffected.
 */
import type { DeliveryStatus } from '@prisma/client';

export interface OutboundWhatsApp {
  to: string;
  toName: string;
  templateName: string;
  body: string;
}

export interface WhatsAppSendResult {
  status: DeliveryStatus;
  providerId: string | null;
  message: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  readonly canSend: boolean;
  send(message: OutboundWhatsApp): Promise<WhatsAppSendResult>;
}

export class LogWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'log';
  readonly canSend = false;

  async send(message: OutboundWhatsApp): Promise<WhatsAppSendResult> {
    return {
      status: 'LOGGED_ONLY',
      providerId: null,
      message: `Logged only. No WhatsApp message was transmitted to ${message.to}. A WhatsApp Business API provider must be configured to send.`,
    };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new LogWhatsAppProvider();
}
