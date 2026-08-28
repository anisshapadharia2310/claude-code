/**
 * Account-level engagement.
 *
 * Deliberately kept out of the contact score. When several stakeholders from
 * one company engage, that is a strong buying signal about the ACCOUNT - but
 * folding it into an individual's score would hide why that person ranks where
 * they do. The multiplier is displayed next to the contact score, never inside
 * it.
 */
import type { AccountSignal, EngagementEvent } from './types';

export interface AccountSignalInput {
  accountId: string;
  companyName: string;
  /** One entry per contact from this account that is in the campaign. */
  contacts: Array<{ contactId: string; events: EngagementEvent[] }>;
}

const ENGAGED_EVENTS = [
  'WHITEPAPER_DOWNLOADED', 'POSITIVE_EMAIL_REPLY', 'EMAIL_CLICKED', 'CTA_CLICKED',
  'RESOURCE_DOWNLOADED', 'POLL_ANSWERED', 'QUESTION_ASKED', 'STAYED_FOR_QA',
  'REPLAY_WATCHED', 'MEETING_REQUESTED', 'WEBINAR_ATTENDED',
] as const;

export function computeAccountSignal(input: AccountSignalInput): AccountSignal {
  let registered = 0;
  let attended = 0;
  let engaged = 0;
  let meetingsRequested = 0;

  for (const contact of input.contacts) {
    const types = new Set(contact.events.map((event) => event.eventType));
    if (types.has('WEBINAR_REGISTERED')) registered += 1;
    if (types.has('WEBINAR_ATTENDED')) attended += 1;
    if (types.has('MEETING_REQUESTED')) meetingsRequested += 1;
    if (ENGAGED_EVENTS.some((type) => types.has(type))) engaged += 1;
  }

  const contactsInCampaign = input.contacts.length;

  let tier: AccountSignal['tier'] = 'NONE';
  let multiplier = 1;
  let message: string | null = null;

  if (meetingsRequested >= 1 && engaged >= 2) {
    tier = 'STRONG';
    multiplier = 1.3;
    message = 'Account-level signal: multiple stakeholders engaged and a meeting has been requested.';
  } else if (engaged >= 3 || (attended >= 2 && engaged >= 2)) {
    tier = 'STRONG';
    multiplier = 1.25;
    message = 'Account-level signal: multiple stakeholders engaged.';
  } else if (engaged >= 2 || attended >= 2) {
    tier = 'ACTIVE';
    multiplier = 1.15;
    message = 'Account-level signal: multiple stakeholders engaged.';
  } else if (registered >= 2) {
    tier = 'EMERGING';
    multiplier = 1.1;
    message = 'Account-level signal: more than one stakeholder registered.';
  }

  return {
    accountId: input.accountId,
    companyName: input.companyName,
    contactsInCampaign,
    registered,
    attended,
    engaged,
    meetingsRequested,
    multiplier,
    tier,
    message,
  };
}

export const ACCOUNT_SIGNAL_TIER_LABELS: Record<AccountSignal['tier'], string> = {
  NONE: 'No account signal',
  EMERGING: 'Emerging account signal',
  ACTIVE: 'Active account signal',
  STRONG: 'Strong account signal',
};
