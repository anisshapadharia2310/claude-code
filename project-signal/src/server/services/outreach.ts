/**
 * Outreach logging.
 *
 * A logged outcome does three things: it writes the channel activity, it
 * appends an engagement event to the ledger, and it moves the contact's status.
 * Scores are then recomputed so the effect of the outcome is visible at once.
 */
import type {
  CallOutcome, DeliveryStatus, EmailType, EventType, OutreachStatus, Prisma,
  ReplySentiment, WhatsAppMessageType,
} from '@prisma/client';
import { pointsForEvent } from '@/domain/engagement';
import { evaluateCompliance } from '@/domain/compliance';
import type { SignalRepository } from '../repo/types';
import { rescoreCampaign } from './scoring';

export interface OutcomeConfig {
  label: string;
  /** Engagement event written to the ledger, if any. */
  event: EventType | null;
  status: OutreachStatus;
  tone: 'positive' | 'neutral' | 'negative';
  /** Suggested follow-up delay in days; null means no automatic follow-up. */
  followUpDays: number | null;
  /** Marks the contact as never to be contacted again. */
  stopsOutreach: boolean;
  hint: string;
}

export const CALL_OUTCOMES: Record<CallOutcome, OutcomeConfig> = {
  CONNECTED: { label: 'Connected', event: 'CALL_CONNECTED', status: 'CONTACTED', tone: 'positive', followUpDays: 3, stopsOutreach: false, hint: 'Spoke to the contact.' },
  NO_ANSWER: { label: 'No answer', event: 'CALL_NO_ANSWER', status: 'ATTEMPTED', tone: 'neutral', followUpDays: 1, stopsOutreach: false, hint: 'Try a different time of day.' },
  BUSY: { label: 'Busy', event: 'CALL_NO_ANSWER', status: 'ATTEMPTED', tone: 'neutral', followUpDays: 1, stopsOutreach: false, hint: 'Line engaged.' },
  CALLBACK_REQUESTED: { label: 'Callback requested', event: 'CALL_CALLBACK_REQUESTED', status: 'CONTACTED', tone: 'positive', followUpDays: 2, stopsOutreach: false, hint: 'Book the callback in the diary.' },
  INTERESTED: { label: 'Interested', event: 'CALL_CONNECTED', status: 'ENGAGED', tone: 'positive', followUpDays: 2, stopsOutreach: false, hint: 'Send the material the same day.' },
  SENT_WHITEPAPER: { label: 'White paper sent', event: 'WHITEPAPER_SENT', status: 'ENGAGED', tone: 'positive', followUpDays: 4, stopsOutreach: false, hint: 'Follow up on whether it was useful.' },
  SENT_WEBINAR_LINK: { label: 'Webinar link sent', event: 'WEBINAR_INVITATION_SENT', status: 'ENGAGED', tone: 'positive', followUpDays: 3, stopsOutreach: false, hint: 'Confirm registration afterwards.' },
  REGISTERED: { label: 'Registered', event: 'WEBINAR_REGISTERED', status: 'REGISTERED', tone: 'positive', followUpDays: 7, stopsOutreach: false, hint: 'Send a reminder the day before.' },
  NOT_RELEVANT: { label: 'Not relevant', event: null, status: 'CLOSED_LOST', tone: 'negative', followUpDays: null, stopsOutreach: false, hint: 'Record why: it improves the role rules.' },
  NOT_INTERESTED: { label: 'Not interested', event: 'NOT_INTERESTED', status: 'NURTURE', tone: 'negative', followUpDays: null, stopsOutreach: false, hint: 'Move to nurture rather than deleting.' },
  WRONG_NUMBER: { label: 'Wrong number', event: null, status: 'ATTEMPTED', tone: 'negative', followUpDays: null, stopsOutreach: false, hint: 'The number is marked wrong and stops scoring.' },
  DO_NOT_CONTACT: { label: 'Do not contact', event: 'OPTED_OUT', status: 'DO_NOT_CONTACT', tone: 'negative', followUpDays: null, stopsOutreach: true, hint: 'Blocks every channel immediately.' },
};

export interface LogCallInput {
  campaignContactId: string;
  callerId: string;
  outcome: CallOutcome;
  notes?: string | null;
  nextAction?: string | null;
  nextFollowUpAt?: Date | null;
  durationSeconds?: number | null;
}

export async function logCall(repo: SignalRepository, input: LogCallInput): Promise<void> {
  const link = await repo.getCampaignContact(input.campaignContactId);
  if (!link) throw new Error('Contact not found on this campaign.');

  const config = CALL_OUTCOMES[input.outcome];
  const now = new Date();
  const followUp = input.nextFollowUpAt
    ?? (config.followUpDays !== null ? new Date(now.getTime() + config.followUpDays * 86_400_000) : null);

  await repo.createCallActivity({
    campaignContactId: link.id,
    callerId: input.callerId,
    callDate: now,
    outcome: input.outcome,
    notes: input.notes ?? null,
    nextAction: input.nextAction ?? config.hint,
    nextFollowUpAt: followUp,
    durationSeconds: input.durationSeconds ?? null,
  });

  if (config.event) {
    await repo.createEngagementEvent({
      campaignId: link.campaignId,
      contactId: link.contactId,
      eventType: config.event,
      eventDate: now,
      pointsAwarded: pointsForEvent(config.event),
      metadata: { source: 'call', outcome: input.outcome } as Prisma.InputJsonValue,
    });
  }

  await repo.updateCampaignContact(link.id, {
    currentStatus: config.status,
    nextFollowUpAt: followUp,
  });

  // Outcomes that change what we are allowed to do are written to the contact
  // and the compliance record, not just the activity log.
  if (input.outcome === 'WRONG_NUMBER') {
    await repo.updateContact(link.contactId, { phoneStatus: 'WRONG_NUMBER' });
  }
  if (config.stopsOutreach) {
    await repo.updateContact(link.contactId, { consentStatus: 'DO_NOT_CONTACT' });
    await repo.upsertComplianceRecord(link.contactId, {
      country: link.contact.country,
      consentStatus: 'DO_NOT_CONTACT',
      optOutStatus: 'GLOBAL_OPT_OUT',
      lawfulBasis: 'NOT_DETERMINED',
      noticeProvided: link.contact.complianceRecords[0]?.noticeProvided ?? false,
      allowedChannels: [],
      blockedChannels: ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'],
      complianceNotes: `Do-not-contact recorded from a call outcome on ${now.toISOString().slice(0, 10)}.`,
      reviewedAt: now,
      reviewedById: input.callerId,
    });
  }

  await rescoreCampaign(repo, link.campaignId, {
    actorId: input.callerId,
    reason: 'ENGAGEMENT_EVENT',
    detail: `Call outcome: ${config.label}.`,
  });
}

export interface LogEmailInput {
  campaignContactId: string;
  actorId: string;
  emailType: EmailType;
  subject: string;
  body: string;
  markSent: boolean;
  replySentiment?: ReplySentiment | null;
}

export async function logEmail(repo: SignalRepository, input: LogEmailInput): Promise<{ status: DeliveryStatus; message: string }> {
  const link = await repo.getCampaignContact(input.campaignContactId);
  if (!link) throw new Error('Contact not found on this campaign.');

  const { getEmailProvider } = await import('../providers/email');
  const provider = getEmailProvider();
  const now = new Date();

  let status: DeliveryStatus = 'LOGGED_ONLY';
  let message = 'Recorded in the activity log. Nothing was transmitted.';

  if (input.markSent) {
    const result = await provider.send({
      to: link.contact.workEmail ?? '',
      toName: `${link.contact.firstName} ${link.contact.lastName}`,
      subject: input.subject,
      body: input.body,
      complianceFooter: '',
    });
    status = result.status;
    message = result.message;
  }

  await repo.createEmailActivity({
    campaignContactId: link.id,
    emailType: input.emailType,
    subject: input.subject,
    body: input.body,
    sentAt: input.markSent ? now : null,
    deliveryStatus: status,
    replySentiment: input.replySentiment ?? null,
    repliedAt: input.replySentiment ? now : null,
    provider: provider.name,
  });

  if (input.markSent) {
    await repo.createEngagementEvent({
      campaignId: link.campaignId,
      contactId: link.contactId,
      eventType: 'EMAIL_SENT',
      eventDate: now,
      pointsAwarded: 0,
      metadata: { subject: input.subject, emailType: input.emailType } as Prisma.InputJsonValue,
    });
  }

  if (input.replySentiment === 'POSITIVE') {
    await repo.createEngagementEvent({
      campaignId: link.campaignId,
      contactId: link.contactId,
      eventType: 'POSITIVE_EMAIL_REPLY',
      eventDate: now,
      pointsAwarded: pointsForEvent('POSITIVE_EMAIL_REPLY'),
    });
  }
  if (input.replySentiment === 'UNSUBSCRIBE') {
    await repo.createEngagementEvent({
      campaignId: link.campaignId,
      contactId: link.contactId,
      eventType: 'OPTED_OUT',
      eventDate: now,
      pointsAwarded: 0,
    });
    await repo.updateContact(link.contactId, { consentStatus: 'OPT_OUT' });
  }

  await repo.updateCampaignContact(link.id, {
    currentStatus: input.replySentiment === 'POSITIVE' ? 'ENGAGED'
      : link.currentStatus === 'NEW' || link.currentStatus === 'ASSIGNED' ? 'CONTACTED' : link.currentStatus,
  });

  await rescoreCampaign(repo, link.campaignId, {
    actorId: input.actorId,
    reason: 'ENGAGEMENT_EVENT',
    detail: `Email logged: ${input.subject}`,
  });

  return { status, message };
}

export interface LogWhatsAppInput {
  campaignContactId: string;
  actorId: string;
  messageType: WhatsAppMessageType;
  messageText: string;
  markSent: boolean;
}

export async function logWhatsApp(
  repo: SignalRepository,
  input: LogWhatsAppInput,
): Promise<{ status: DeliveryStatus; message: string }> {
  const link = await repo.getCampaignContact(input.campaignContactId);
  if (!link) throw new Error('Contact not found on this campaign.');

  // The channel check is re-run at send time, not trusted from the page that
  // rendered the button.
  const rules = await repo.listCountryRules();
  const compliance = evaluateCompliance({
    contact: link.contact,
    record: link.contact.complianceRecords[0] ?? null,
    rule: rules.find((rule) => rule.country === link.contact.country) ?? null,
    campaignChannels: link.campaign.allowedChannels,
  });
  if (!compliance.allowedChannels.includes('WHATSAPP')) {
    const reason = compliance.blockedChannels.find((entry) => entry.channel === 'WHATSAPP')?.reason
      ?? 'WhatsApp is not permitted for this contact.';
    throw new Error(`WhatsApp is blocked for this contact: ${reason}`);
  }

  const { getWhatsAppProvider } = await import('../providers/whatsapp');
  const provider = getWhatsAppProvider();
  const now = new Date();

  let status: DeliveryStatus = 'LOGGED_ONLY';
  let message = 'Recorded in the activity log. Nothing was transmitted.';

  if (input.markSent) {
    const result = await provider.send({
      to: link.contact.phoneNumber ?? '',
      toName: `${link.contact.firstName} ${link.contact.lastName}`,
      templateName: input.messageType,
      body: input.messageText,
    });
    status = result.status;
    message = result.message;
  }

  await repo.createWhatsAppActivity({
    campaignContactId: link.id,
    messageType: input.messageType,
    messageText: input.messageText,
    sentAt: input.markSent ? now : null,
    deliveryStatus: status,
    provider: provider.name,
  });

  return { status, message };
}
