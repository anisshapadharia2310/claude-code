import {
  CallOutcome,
  ConsentStatus,
  DeliveryStatus,
  EmailType,
  EventType,
  OptOutStatus,
  OutreachStatus,
  PhoneStatus,
  Prisma,
  ScoreChangeSource,
  WhatsAppMessageType,
  WhatsAppStatus,
} from '@prisma/client';
import { prisma } from '../db';
import { pointsForEvent } from '../domain/engagement';
import { complianceFooter, getEmailProvider } from '../providers/email';
import { getWhatsAppProvider } from '../providers/whatsapp';
import { rescoreCampaignContact } from './scoring-service';

/**
 * How a call outcome translates into the rest of the system. Each outcome maps
 * to an engagement event (where one exists), a new outreach status, and any
 * side effect on the contact record itself.
 */
const CALL_OUTCOME_EFFECTS: Record<
  CallOutcome,
  {
    event: EventType | null;
    status: OutreachStatus;
    /** Applied to the Contact row, e.g. marking a number wrong. */
    contactUpdate?: Prisma.ContactUpdateInput;
    note: string;
  }
> = {
  CONNECTED: {
    event: EventType.CALL_CONNECTED,
    status: OutreachStatus.CONTACTED,
    note: 'Spoke with the contact.',
  },
  NO_ANSWER: {
    event: EventType.CALL_NO_ANSWER,
    status: OutreachStatus.ATTEMPTED,
    note: 'No answer.',
  },
  BUSY: {
    event: EventType.CALL_NO_ANSWER,
    status: OutreachStatus.ATTEMPTED,
    note: 'Line busy.',
  },
  CALLBACK_REQUESTED: {
    event: EventType.CALL_CALLBACK_REQUESTED,
    status: OutreachStatus.CONTACTED,
    note: 'Callback requested.',
  },
  INTERESTED: {
    event: EventType.CALL_CONNECTED,
    status: OutreachStatus.ENGAGED,
    note: 'Contact expressed interest.',
  },
  SENT_WHITEPAPER: {
    event: EventType.WHITEPAPER_SENT,
    status: OutreachStatus.ENGAGED,
    note: 'White paper sent.',
  },
  SENT_WEBINAR_LINK: {
    event: EventType.WEBINAR_INVITATION_SENT,
    status: OutreachStatus.ENGAGED,
    note: 'Webinar link sent.',
  },
  REGISTERED: {
    event: EventType.WEBINAR_REGISTERED,
    status: OutreachStatus.REGISTERED,
    note: 'Registered for the webinar.',
  },
  NOT_RELEVANT: {
    event: null,
    status: OutreachStatus.REJECTED,
    contactUpdate: { roleRelevanceNotes: 'Caller confirmed the role is not relevant.' },
    note: 'Role confirmed not relevant - removed from the callable list.',
  },
  NOT_INTERESTED: {
    event: EventType.NOT_INTERESTED,
    status: OutreachStatus.NOT_INTERESTED,
    note: 'Not interested in this topic.',
  },
  WRONG_NUMBER: {
    event: null,
    status: OutreachStatus.ATTEMPTED,
    contactUpdate: { phoneStatus: PhoneStatus.WRONG_NUMBER },
    note: 'Wrong number - phone marked invalid, email remains available.',
  },
  DO_NOT_CONTACT: {
    event: EventType.OPTED_OUT,
    status: OutreachStatus.DO_NOT_CONTACT,
    contactUpdate: { consentStatus: ConsentStatus.DO_NOT_CONTACT },
    note: 'Do-not-contact recorded. All outreach is now blocked.',
  },
};

export interface LogCallInput {
  campaignContactId: string;
  callerId: string;
  outcome: CallOutcome;
  notes?: string | null;
  nextAction?: string | null;
  nextFollowUpAt?: Date | null;
}

/**
 * Records a call outcome: writes the activity, raises the matching engagement
 * event, updates the contact and its status, then re-scores.
 */
export async function logCall(input: LogCallInput) {
  const record = await prisma.campaignContact.findUniqueOrThrow({
    where: { id: input.campaignContactId },
    select: { id: true, campaignId: true, contactId: true },
  });
  const effect = CALL_OUTCOME_EFFECTS[input.outcome];

  await prisma.$transaction(async (tx) => {
    await tx.callActivity.create({
      data: {
        campaignContactId: record.id,
        callerId: input.callerId,
        outcome: input.outcome,
        notes: input.notes ?? null,
        nextAction: input.nextAction ?? effect.note,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
      },
    });

    if (effect.event) {
      await tx.engagementEvent.create({
        data: {
          campaignId: record.campaignId,
          contactId: record.contactId,
          eventType: effect.event,
          pointsAwarded: pointsForEvent(effect.event),
          metadata: { source: 'call', outcome: input.outcome } as Prisma.InputJsonValue,
        },
      });
    }

    if (effect.contactUpdate) {
      await tx.contact.update({ where: { id: record.contactId }, data: effect.contactUpdate });
    }

    // A do-not-contact outcome must also land on the compliance record, since
    // that is what the compliance gate reads.
    if (input.outcome === CallOutcome.DO_NOT_CONTACT) {
      const existing = await tx.complianceRecord.findFirst({
        where: { contactId: record.contactId },
        orderBy: { updatedAt: 'desc' },
      });
      if (existing) {
        await tx.complianceRecord.update({
          where: { id: existing.id },
          data: {
            consentStatus: ConsentStatus.DO_NOT_CONTACT,
            optOutStatus: OptOutStatus.GLOBAL_OPT_OUT,
            complianceNotes: `Do-not-contact requested during a call on ${new Date().toISOString().slice(0, 10)}.`,
          },
        });
      }
    }

    await tx.campaignContact.update({
      where: { id: record.id },
      data: {
        currentStatus: effect.status,
        nextFollowUpAt: input.nextFollowUpAt ?? undefined,
      },
    });
  });

  await rescoreCampaignContact(record.id, {
    source: ScoreChangeSource.CALL_OUTCOME,
    reason: `Call outcome recorded: ${input.outcome.replace(/_/g, ' ').toLowerCase()}.`,
    changedById: input.callerId,
  });

  return effect;
}

export interface LogEmailInput {
  campaignContactId: string;
  emailType: EmailType;
  subject: string;
  body: string;
  /** True when the user pressed "log manually" rather than "send". */
  manualLog?: boolean;
}

/**
 * Drafts, "sends" (via the provider abstraction) and records an email. With the
 * default log provider nothing is transmitted.
 */
export async function logEmail(input: LogEmailInput) {
  const record = await prisma.campaignContact.findUniqueOrThrow({
    where: { id: input.campaignContactId },
    include: { contact: true, campaign: true },
  });
  if (!record.contact.workEmail) {
    throw new Error('This contact has no email address on record.');
  }

  const provider = getEmailProvider();
  const result = await provider.send({
    to: record.contact.workEmail,
    subject: input.subject,
    body: input.body,
    complianceFooter: complianceFooter(),
  });

  const activity = await prisma.emailActivity.create({
    data: {
      campaignContactId: record.id,
      emailType: input.emailType,
      subject: input.subject,
      body: `${input.body}\n\n${complianceFooter()}`,
      sentAt: new Date(),
      deliveryStatus: result.status,
      provider: result.provider,
    },
  });

  await prisma.engagementEvent.create({
    data: {
      campaignId: record.campaignId,
      contactId: record.contactId,
      eventType: EventType.EMAIL_SENT,
      pointsAwarded: 0,
      metadata: {
        emailType: input.emailType,
        subject: input.subject,
        provider: result.provider,
      } as Prisma.InputJsonValue,
    },
  });

  if (record.currentStatus === OutreachStatus.NEW || record.currentStatus === OutreachStatus.ASSIGNED) {
    await prisma.campaignContact.update({
      where: { id: record.id },
      data: { currentStatus: OutreachStatus.CONTACTED },
    });
  }

  return { activity, result };
}

export interface LogWhatsAppInput {
  campaignContactId: string;
  messageType: WhatsAppMessageType;
  messageText: string;
}

export async function logWhatsApp(input: LogWhatsAppInput) {
  const record = await prisma.campaignContact.findUniqueOrThrow({
    where: { id: input.campaignContactId },
    include: { contact: true },
  });

  // Defence in depth: the UI hides the button, and the service refuses too.
  if (record.contact.whatsappStatus !== WhatsAppStatus.AVAILABLE_OPTED_IN) {
    throw new Error(
      `WhatsApp is not permitted for this contact (status: ${record.contact.whatsappStatus.replace(/_/g, ' ').toLowerCase()}).`,
    );
  }
  if (!record.contact.phoneNumber) {
    throw new Error('This contact has no phone number on record.');
  }

  const provider = getWhatsAppProvider();
  const result = await provider.send({
    to: record.contact.phoneNumber,
    text: input.messageText,
    template: input.messageType,
  });

  const activity = await prisma.whatsAppActivity.create({
    data: {
      campaignContactId: record.id,
      messageType: input.messageType,
      messageText: input.messageText,
      sentAt: new Date(),
      deliveryStatus: result.status,
      provider: result.provider,
    },
  });

  return { activity, result };
}

/** Records an arbitrary engagement event and re-scores the contact. */
export async function recordEngagementEvent(params: {
  campaignId: string;
  contactId: string;
  eventType: EventType;
  eventDate?: Date;
  metadata?: Record<string, unknown>;
  changedById?: string | null;
}) {
  const event = await prisma.engagementEvent.create({
    data: {
      campaignId: params.campaignId,
      contactId: params.contactId,
      eventType: params.eventType,
      eventDate: params.eventDate ?? new Date(),
      pointsAwarded: pointsForEvent(params.eventType),
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  const campaignContact = await prisma.campaignContact.findUnique({
    where: { campaignId_contactId: { campaignId: params.campaignId, contactId: params.contactId } },
    select: { id: true },
  });

  if (campaignContact) {
    await applyStatusForEvent(campaignContact.id, params.eventType);
    await rescoreCampaignContact(campaignContact.id, {
      source: ScoreChangeSource.ENGAGEMENT_EVENT,
      reason: `Engagement event recorded: ${params.eventType.replace(/_/g, ' ').toLowerCase()}.`,
      changedById: params.changedById ?? null,
    });
  }

  return event;
}

const EVENT_STATUS: Partial<Record<EventType, OutreachStatus>> = {
  WEBINAR_REGISTERED: OutreachStatus.REGISTERED,
  WEBINAR_ATTENDED: OutreachStatus.ATTENDED,
  WEBINAR_ATTENDANCE_50_PERCENT: OutreachStatus.ATTENDED,
  WEBINAR_ATTENDANCE_75_PERCENT: OutreachStatus.ATTENDED,
  WEBINAR_ATTENDANCE_80_PERCENT: OutreachStatus.ATTENDED,
  MEETING_REQUESTED: OutreachStatus.MEETING_REQUESTED,
  POSITIVE_EMAIL_REPLY: OutreachStatus.ENGAGED,
  NOT_INTERESTED: OutreachStatus.NOT_INTERESTED,
  OPTED_OUT: OutreachStatus.DO_NOT_CONTACT,
};

async function applyStatusForEvent(campaignContactId: string, eventType: EventType) {
  const status = EVENT_STATUS[eventType];
  if (!status) return;
  await prisma.campaignContact.update({ where: { id: campaignContactId }, data: { currentStatus: status } });
}

export { CALL_OUTCOME_EFFECTS };
