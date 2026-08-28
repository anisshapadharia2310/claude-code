/**
 * Country-aware compliance engine.
 *
 * This module decides which channels may be used for a contact right now. It
 * evaluates recorded facts against configurable per-country rules. It does not
 * encode legal conclusions: every rule that matters is data in
 * CountryComplianceRule, editable by an administrator.
 *
 * Confirm country-specific legal rules with qualified privacy counsel before
 * campaign launch.
 */
import { daysBetween } from './normalize';
import type {
  BlockedChannel,
  Channel,
  ComplianceRecord,
  ComplianceResult,
  Contact,
  CountryComplianceRule,
} from './types';

export const ADMIN_LEGAL_WARNING =
  'Confirm country-specific legal rules with qualified privacy counsel before campaign launch.';

export const ALL_CHANNELS: Channel[] = ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'];

/** Channels that count as electronic direct marketing for consent purposes. */
const ELECTRONIC_CHANNELS: Channel[] = ['EMAIL', 'WHATSAPP', 'SMS'];

/**
 * Default rule applied when a country has no explicit configuration. It is
 * deliberately conservative: outreach is possible, but a lawful basis must be
 * recorded and WhatsApp needs its own opt-in.
 */
export const DEFAULT_COUNTRY_RULE: Omit<CountryComplianceRule, 'id' | 'country' | 'createdAt' | 'updatedAt'> = {
  permittedChannels: ['EMAIL', 'PHONE', 'LINKEDIN', 'POST'],
  prohibitedChannels: [],
  requiresExplicitOptIn: false,
  whatsappRequiresOptIn: true,
  requiresLawfulBasis: true,
  requiresNotice: false,
  consentValidityDays: null,
  policyNotes: null,
};

export type ComplianceContactFacts = Pick<
  Contact,
  'country' | 'consentStatus' | 'communicationRestrictions' | 'whatsappStatus' | 'phoneStatus' | 'emailStatus' | 'workEmail' | 'phoneNumber'
>;

export interface ComplianceInput {
  contact: ComplianceContactFacts;
  record: ComplianceRecord | null;
  rule: CountryComplianceRule | null;
  /** Channels the campaign itself permits, before any contact-level check. */
  campaignChannels?: Channel[];
  now?: Date;
}

function block(list: BlockedChannel[], channel: Channel, reason: string): void {
  if (!list.some((entry) => entry.channel === channel)) list.push({ channel, reason });
}

/**
 * Evaluate a contact's outreach permissions.
 *
 * BLOCKED  - never contact (do-not-contact, global opt-out, or no channel can
 *            ever be unblocked for this record).
 * HOLD     - required compliance information is missing or stale. Outreach is
 *            blocked until a human completes the record.
 * PASS     - at least one channel is usable and all required fields exist.
 */
export function evaluateCompliance(input: ComplianceInput): ComplianceResult {
  const now = input.now ?? new Date();
  const rule: Omit<CountryComplianceRule, 'id' | 'country' | 'createdAt' | 'updatedAt'> =
    input.rule ?? DEFAULT_COUNTRY_RULE;
  const record = input.record;
  const contact = input.contact;

  const blocked: BlockedChannel[] = [];
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // --- absolute stops -----------------------------------------------------
  const doNotContact =
    contact.consentStatus === 'DO_NOT_CONTACT'
    || record?.consentStatus === 'DO_NOT_CONTACT'
    || record?.optOutStatus === 'GLOBAL_OPT_OUT';

  if (doNotContact) {
    for (const channel of ALL_CHANNELS) block(blocked, channel, 'Contact is marked do-not-contact.');
    return {
      status: 'BLOCKED',
      allowedChannels: [],
      blockedChannels: blocked,
      missingFields: [],
      warnings: [],
      doNotContact: true,
      summary: 'Do not contact. All outreach is blocked on every channel.',
    };
  }

  if (contact.consentStatus === 'OPT_OUT') {
    for (const channel of ELECTRONIC_CHANNELS) block(blocked, channel, 'Contact opted out of electronic outreach.');
  }

  // --- start from the country's permitted set -----------------------------
  let candidates = new Set<Channel>(rule.permittedChannels);
  if (candidates.size === 0) candidates = new Set<Channel>(DEFAULT_COUNTRY_RULE.permittedChannels);

  for (const channel of ALL_CHANNELS) {
    if (!candidates.has(channel)) {
      block(blocked, channel, `Not a permitted channel for ${contact.country} under current policy.`);
    }
  }
  for (const channel of rule.prohibitedChannels) {
    candidates.delete(channel);
    block(blocked, channel, `Prohibited for ${contact.country} under current policy.`);
  }

  // --- narrow by the contact's own record ---------------------------------
  if (record) {
    if (record.allowedChannels.length > 0) {
      for (const channel of Array.from(candidates)) {
        if (!record.allowedChannels.includes(channel)) {
          candidates.delete(channel);
          block(blocked, channel, 'Not in the channels this contact permitted.');
        }
      }
    }
    for (const channel of record.blockedChannels) {
      candidates.delete(channel);
      block(blocked, channel, 'Blocked on this contact\'s compliance record.');
    }
    if (record.optOutStatus === 'EMAIL_OPT_OUT') {
      candidates.delete('EMAIL');
      block(blocked, 'EMAIL', 'Contact opted out of email.');
    }
    if (record.optOutStatus === 'PHONE_OPT_OUT') {
      candidates.delete('PHONE');
      block(blocked, 'PHONE', 'Contact opted out of calls.');
    }
    if (record.optOutStatus === 'WHATSAPP_OPT_OUT') {
      candidates.delete('WHATSAPP');
      block(blocked, 'WHATSAPP', 'Contact opted out of WhatsApp.');
    }
  }

  // Free-text restrictions recorded on the contact itself.
  for (const restriction of contact.communicationRestrictions) {
    const value = restriction.trim().toUpperCase();
    const match = ALL_CHANNELS.find((channel) => value.includes(channel));
    if (match) {
      candidates.delete(match);
      block(blocked, match, `Contact restriction recorded: "${restriction}".`);
    }
  }

  if (contact.consentStatus === 'OPT_OUT') {
    for (const channel of ELECTRONIC_CHANNELS) candidates.delete(channel);
  }

  // --- channel reachability ------------------------------------------------
  if (!contact.workEmail || contact.emailStatus === 'INVALID' || contact.emailStatus === 'BOUNCED' || contact.emailStatus === 'MISSING') {
    candidates.delete('EMAIL');
    block(blocked, 'EMAIL', contact.workEmail ? 'Email address is invalid or bounced.' : 'No email address on record.');
  }
  if (!contact.phoneNumber || contact.phoneStatus === 'INVALID' || contact.phoneStatus === 'WRONG_NUMBER' || contact.phoneStatus === 'MISSING') {
    candidates.delete('PHONE');
    block(blocked, 'PHONE', contact.phoneNumber ? 'Phone number is invalid.' : 'No phone number on record.');
  }
  if (contact.phoneStatus === 'DO_NOT_CALL') {
    candidates.delete('PHONE');
    block(blocked, 'PHONE', 'Number is on a do-not-call list.');
  }

  // --- WhatsApp needs its own documented permission ------------------------
  if (candidates.has('WHATSAPP')) {
    const optedIn = contact.whatsappStatus === 'AVAILABLE_OPTED_IN';
    if (rule.whatsappRequiresOptIn && !optedIn) {
      candidates.delete('WHATSAPP');
      block(
        blocked,
        'WHATSAPP',
        contact.whatsappStatus === 'NOT_AVAILABLE'
          ? 'No WhatsApp number available for this contact.'
          : 'WhatsApp requires a separate documented opt-in, which is not on record.',
      );
    }
  }
  if (contact.whatsappStatus === 'OPTED_OUT' || contact.whatsappStatus === 'BLOCKED_BY_POLICY') {
    candidates.delete('WHATSAPP');
    block(blocked, 'WHATSAPP', 'Contact has opted out of, or is policy-blocked from, WhatsApp.');
  }

  // --- required record completeness ---------------------------------------
  if (!record) {
    missingFields.push('compliance record');
  } else {
    if (rule.requiresLawfulBasis && record.lawfulBasis === 'NOT_DETERMINED') missingFields.push('lawful basis');
    if (rule.requiresNotice && !record.noticeProvided) missingFields.push('privacy notice provided');
    if (record.consentStatus === 'NOT_CAPTURED') missingFields.push('consent status');
    if (record.consentStatus !== 'NOT_CAPTURED' && !record.consentSource) missingFields.push('consent source');
    if (rule.consentValidityDays && record.consentDate) {
      const age = daysBetween(record.consentDate, now);
      if (age > rule.consentValidityDays) {
        warnings.push(`Consent is ${age} days old and exceeds the ${rule.consentValidityDays}-day validity window for ${contact.country}.`);
        missingFields.push('refreshed consent');
      }
    }
  }

  if (rule.requiresExplicitOptIn) {
    const explicit = record?.consentStatus === 'EXPLICIT_OPT_IN' || contact.consentStatus === 'EXPLICIT_OPT_IN';
    if (!explicit) {
      for (const channel of ELECTRONIC_CHANNELS) {
        if (candidates.has(channel)) {
          candidates.delete(channel);
          block(blocked, channel, `${contact.country} requires an explicit opt-in before electronic outreach.`);
        }
      }
      missingFields.push('explicit opt-in');
    }
  }

  // --- campaign-level channel restriction ----------------------------------
  if (input.campaignChannels && input.campaignChannels.length > 0) {
    for (const channel of Array.from(candidates)) {
      if (!input.campaignChannels.includes(channel)) {
        candidates.delete(channel);
        block(blocked, channel, 'Channel is not enabled for this campaign.');
      }
    }
  }

  const allowedChannels = ALL_CHANNELS.filter((channel) => candidates.has(channel));

  if (record?.reviewedAt === null || record?.reviewedAt === undefined) {
    if (record) warnings.push('Compliance record has never been reviewed by a person.');
  }

  let status: ComplianceResult['status'];
  let summary: string;

  if (missingFields.length > 0) {
    status = 'HOLD';
    summary = `Compliance hold: missing ${missingFields.join(', ')}.`;
  } else if (allowedChannels.length === 0) {
    status = 'BLOCKED';
    summary = 'No channel is currently permitted for this contact.';
  } else {
    status = 'PASS';
    summary = `Permitted channels: ${allowedChannels.join(', ')}.`;
  }

  return {
    status,
    allowedChannels,
    blockedChannels: blocked,
    missingFields,
    warnings,
    doNotContact: false,
    summary,
  };
}

/** Guard used before rendering any Send or Contact action. */
export function canUseChannel(result: ComplianceResult, channel: Channel): boolean {
  return !result.doNotContact && result.allowedChannels.includes(channel);
}

/** The reason a channel is unavailable, for display next to a disabled button. */
export function channelBlockReason(result: ComplianceResult, channel: Channel): string | null {
  if (result.allowedChannels.includes(channel)) return null;
  const entry = result.blockedChannels.find((item) => item.channel === channel);
  return entry?.reason ?? 'Channel is not currently permitted.';
}
