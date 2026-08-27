import { DeliveryStatus } from '@prisma/client';

export interface OutboundWhatsAppMessage {
  to: string;
  text: string;
  /** Template identifier, required by the WhatsApp Business API. */
  template?: string;
}

export interface WhatsAppSendResult {
  status: DeliveryStatus;
  provider: string;
  message: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  readonly transmits: boolean;
  send(message: OutboundWhatsAppMessage): Promise<WhatsAppSendResult>;
}

/** Records the message without transmitting it. See the email provider note. */
export const logOnlyWhatsAppProvider: WhatsAppProvider = {
  name: 'log',
  transmits: false,
  async send(): Promise<WhatsAppSendResult> {
    return {
      status: DeliveryStatus.LOGGED_MANUALLY,
      provider: 'log',
      message:
        'Recorded in SIGNAL only. No WhatsApp Business API integration is connected, so nothing was transmitted.',
    };
  },
};

export function getWhatsAppProvider(): WhatsAppProvider {
  return logOnlyWhatsAppProvider;
}
