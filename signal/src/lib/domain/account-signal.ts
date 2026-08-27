import { EventType } from '@prisma/client';
import type { AccountSignal } from './types';
import { POSITIVE_INTENT_EVENTS } from './engagement';

export interface AccountSignalInput {
  accountId: string;
  companyName: string;
  contactsInCampaign: number;
  /** One entry per contact at this account, listing their event types. */
  contactEvents: Array<{ contactId: string; eventTypes: EventType[] }>;
}

const ATTENDANCE_EVENTS: EventType[] = [
  EventType.WEBINAR_ATTENDED,
  EventType.WEBINAR_ATTENDANCE_50_PERCENT,
  EventType.WEBINAR_ATTENDANCE_75_PERCENT,
  EventType.WEBINAR_ATTENDANCE_80_PERCENT,
];

/**
 * Aggregates engagement across every contact at one account.
 *
 * The multiplier is returned as a separate account-level signal and is
 * deliberately NOT folded into any individual contact score - the brief requires
 * the reason for a contact's score to stay visible and attributable.
 */
export function calculateAccountSignal({
  accountId,
  companyName,
  contactsInCampaign,
  contactEvents,
}: AccountSignalInput): AccountSignal {
  let registered = 0;
  let attended = 0;
  let engaged = 0;
  let meetingsRequested = 0;

  for (const contact of contactEvents) {
    const types = new Set(contact.eventTypes);
    if (types.has(EventType.WEBINAR_REGISTERED)) registered += 1;
    if (ATTENDANCE_EVENTS.some((e) => types.has(e))) attended += 1;
    if (POSITIVE_INTENT_EVENTS.some((e) => types.has(e))) engaged += 1;
    if (types.has(EventType.MEETING_REQUESTED)) meetingsRequested += 1;
  }

  // +10% per engaged stakeholder beyond the first, capped at 1.5x.
  const multiplier = Math.min(1.5, 1 + Math.max(0, engaged - 1) * 0.1);

  let label = 'No account activity';
  let note: string | null = null;
  if (meetingsRequested > 0) {
    label = 'Buying committee active';
    note = `Account-level signal: ${meetingsRequested} stakeholder${meetingsRequested > 1 ? 's' : ''} requested a meeting.`;
  } else if (engaged > 1) {
    label = 'Multiple stakeholders engaged';
    note = 'Account-level signal: multiple stakeholders engaged.';
  } else if (engaged === 1) {
    label = 'Single stakeholder engaged';
    note = 'Account-level signal: one stakeholder engaged.';
  }

  return {
    accountId,
    companyName,
    contactsInCampaign,
    registered,
    attended,
    engaged,
    meetingsRequested,
    distinctEngagedStakeholders: engaged,
    multiplier: Number(multiplier.toFixed(2)),
    label,
    note,
  };
}
