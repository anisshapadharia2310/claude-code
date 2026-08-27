import {
  Channel,
  ConsentRequirement,
  ConsentStatus,
  OptOutStatus,
  PhoneStatus,
  WhatsAppStatus,
} from '@prisma/client';
import type {
  ChannelPermission,
  ComplianceGateResult,
  ComplianceRecordInput,
  ContactInput,
  CountryRuleInput,
  GateCheck,
} from './types';

/**
 * Warning shown to administrators anywhere compliance is configured. The
 * application deliberately does not encode legal conclusions.
 */
export const LEGAL_DISCLAIMER =
  'Confirm country-specific legal rules with qualified privacy counsel before campaign launch.';

/** Applied when no country rule has been configured yet - conservative by design. */
export const FALLBACK_COUNTRY_RULE: Omit<CountryRuleInput, 'country'> = {
  emailRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT,
  phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT,
  whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED,
  requiredFields: ['consentStatus', 'lawfulBasis'],
  noticeRequired: false,
};

/** Ranks consent strength so a requirement can be compared against a record. */
const CONSENT_STRENGTH: Record<ConsentStatus, number> = {
  DO_NOT_CONTACT: -2,
  OPT_OUT: -1,
  NOT_CAPTURED: 0,
  LEGITIMATE_INTEREST: 1,
  SOFT_OPT_IN: 2,
  EXPLICIT_OPT_IN: 3,
};

const REQUIREMENT_STRENGTH: Record<ConsentRequirement, number> = {
  CHANNEL_PROHIBITED: 99,
  EXPLICIT_OPT_IN_REQUIRED: 3,
  SOFT_OPT_IN_SUFFICIENT: 2,
  LEGITIMATE_INTEREST_SUFFICIENT: 1,
};

const OPT_OUT_BY_CHANNEL: Record<Channel, OptOutStatus> = {
  EMAIL: OptOutStatus.EMAIL_OPT_OUT,
  PHONE: OptOutStatus.PHONE_OPT_OUT,
  WHATSAPP: OptOutStatus.WHATSAPP_OPT_OUT,
  LINKEDIN: OptOutStatus.NONE,
};

export interface ComplianceGateInput {
  contact: ContactInput;
  record?: ComplianceRecordInput | null;
  countryRule?: CountryRuleInput | null;
}

/** Human-readable label for a field name used in the "missing fields" list. */
const FIELD_LABELS: Record<string, string> = {
  consentStatus: 'Consent status',
  consentSource: 'Consent source',
  consentDate: 'Consent date',
  lawfulBasis: 'Lawful basis',
  noticeProvided: 'Notice provided',
  allowedChannels: 'Allowed channels',
};

function isFieldPresent(record: ComplianceRecordInput | null | undefined, field: string): boolean {
  if (!record) return false;
  switch (field) {
    case 'consentStatus':
      return record.consentStatus !== ConsentStatus.NOT_CAPTURED;
    case 'consentSource':
      return !!record.consentSource;
    case 'consentDate':
      return !!record.consentDate;
    case 'lawfulBasis':
      return record.lawfulBasis !== 'NOT_DETERMINED';
    case 'noticeProvided':
      return record.noticeProvided === true;
    case 'allowedChannels':
      return record.allowedChannels.length > 0;
    default:
      return true;
  }
}

/**
 * Country-aware compliance gate.
 *
 * Outcomes:
 *  - BLOCK: do-not-contact, global opt-out, or every channel prohibited. Outreach
 *    is refused and the contact is rejected.
 *  - HOLD:  required compliance information is missing. Outreach is paused until
 *    a human completes the record (priority COMPLIANCE_HOLD).
 *  - PASS:  at least one channel is permitted.
 */
export function evaluateComplianceGate({
  contact,
  record,
  countryRule,
}: ComplianceGateInput): ComplianceGateResult {
  const rule: CountryRuleInput = {
    country: contact.country,
    ...FALLBACK_COUNTRY_RULE,
    ...(countryRule ?? {}),
  };

  const checks: GateCheck[] = [];
  const warnings: string[] = [];

  const effectiveConsent = record?.consentStatus ?? contact.consentStatus;
  const optOutStatus = record?.optOutStatus ?? OptOutStatus.NONE;

  const doNotContact =
    effectiveConsent === ConsentStatus.DO_NOT_CONTACT ||
    optOutStatus === OptOutStatus.GLOBAL_OPT_OUT ||
    contact.communicationRestrictions.some((r) => /do[\s-]?not[\s-]?contact|dnc/i.test(r));

  checks.push({
    key: 'doNotContact',
    label: 'Contact is not marked do-not-contact',
    passed: !doNotContact,
    blocking: true,
    detail: doNotContact
      ? 'Do-not-contact or global opt-out is recorded. All outreach is blocked.'
      : 'No do-not-contact flag on record.',
  });

  const globallyOptedOut = effectiveConsent === ConsentStatus.OPT_OUT;
  checks.push({
    key: 'optOut',
    label: 'Contact has not opted out',
    passed: !globallyOptedOut,
    blocking: true,
    detail: globallyOptedOut ? 'Contact opted out of communication.' : 'No opt-out recorded.',
  });

  // Required-field completeness for this country.
  const missingFields = rule.requiredFields
    .filter((field) => !isFieldPresent(record, field))
    .map((field) => FIELD_LABELS[field] ?? field);
  if (rule.noticeRequired && !record?.noticeProvided) {
    missingFields.push('Privacy notice provided');
  }
  checks.push({
    key: 'requiredFields',
    label: `Required compliance fields for ${rule.country} are complete`,
    passed: missingFields.length === 0,
    blocking: false,
    detail:
      missingFields.length === 0
        ? 'All required compliance fields are recorded.'
        : `Missing: ${missingFields.join(', ')}.`,
  });

  if (!record) {
    warnings.push(`No compliance record exists for this contact in ${rule.country}.`);
  }

  // Per-channel permission.
  const permissions: ChannelPermission[] = [];
  const requirementByChannel: Record<Channel, ConsentRequirement> = {
    EMAIL: rule.emailRequirement,
    PHONE: rule.phoneRequirement,
    WHATSAPP: rule.whatsappRequirement,
    LINKEDIN: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT,
  };

  for (const channel of [Channel.EMAIL, Channel.PHONE, Channel.WHATSAPP] as Channel[]) {
    const requirement = requirementByChannel[channel];
    const explicitlyBlocked = record?.blockedChannels.includes(channel) ?? false;
    const explicitlyAllowed = record?.allowedChannels.includes(channel) ?? false;
    const channelOptOut = optOutStatus === OPT_OUT_BY_CHANNEL[channel];

    let allowed = true;
    let reason = '';
    let requiresReview = false;

    if (doNotContact || globallyOptedOut) {
      allowed = false;
      reason = 'Contact is opted out or marked do-not-contact.';
    } else if (requirement === ConsentRequirement.CHANNEL_PROHIBITED) {
      allowed = false;
      reason = `${channel} outreach is prohibited by the configured rule for ${rule.country}.`;
    } else if (channelOptOut) {
      allowed = false;
      reason = `Contact opted out of ${channel.toLowerCase()} specifically.`;
    } else if (explicitlyBlocked) {
      allowed = false;
      reason = `${channel} is listed in this contact's blocked channels.`;
    } else if (CONSENT_STRENGTH[effectiveConsent] < REQUIREMENT_STRENGTH[requirement]) {
      allowed = false;
      reason = `${rule.country} requires ${requirement.replace(/_/g, ' ').toLowerCase()} for ${channel.toLowerCase()}; recorded consent is ${effectiveConsent.replace(/_/g, ' ').toLowerCase()}.`;
    } else {
      // Consent is sufficient - now check the channel is physically reachable.
      if (channel === Channel.EMAIL && !contact.workEmail) {
        allowed = false;
        reason = 'No work email address on record.';
      } else if (channel === Channel.PHONE && (!contact.phoneNumber || contact.phoneStatus === PhoneStatus.WRONG_NUMBER || contact.phoneStatus === PhoneStatus.INVALID)) {
        allowed = false;
        reason = contact.phoneNumber ? 'Phone number is invalid or wrong.' : 'No phone number on record.';
      } else if (
        channel === Channel.WHATSAPP &&
        (contact.whatsappStatus === WhatsAppStatus.NOT_AVAILABLE ||
          contact.whatsappStatus === WhatsAppStatus.OPTED_OUT ||
          contact.whatsappStatus === WhatsAppStatus.BLOCKED_BY_POLICY)
      ) {
        allowed = false;
        reason = `WhatsApp is not available for this contact (${contact.whatsappStatus.replace(/_/g, ' ').toLowerCase()}).`;
      } else {
        allowed = true;
        reason = explicitlyAllowed
          ? `Explicitly permitted on this contact's compliance record.`
          : `Consent (${effectiveConsent.replace(/_/g, ' ').toLowerCase()}) satisfies the ${rule.country} requirement.`;
        requiresReview = missingFields.length > 0;
      }
    }

    permissions.push({ channel, allowed, requiresReview, reason });
  }

  const allowedChannels = permissions.filter((p) => p.allowed).map((p) => p.channel);

  checks.push({
    key: 'channelAvailable',
    label: 'At least one channel is permitted',
    passed: allowedChannels.length > 0,
    blocking: true,
    detail:
      allowedChannels.length > 0
        ? `Permitted: ${allowedChannels.join(', ')}.`
        : 'No permitted channel - outreach cannot proceed.',
  });

  let outcome: ComplianceGateResult['outcome'];
  if (doNotContact || globallyOptedOut) {
    outcome = 'BLOCK';
  } else if (missingFields.length > 0 || allowedChannels.length === 0) {
    outcome = 'HOLD';
  } else {
    outcome = 'PASS';
  }

  if (outcome === 'HOLD' && missingFields.length > 0) {
    warnings.push(`Compliance record is incomplete for ${rule.country}: ${missingFields.join(', ')}.`);
  }

  return {
    outcome,
    passed: outcome === 'PASS',
    checks,
    permissions,
    allowedChannels,
    missingFields,
    warnings,
  };
}

/** Convenience used by the UI before rendering a Send or Contact action. */
export function canUseChannel(result: ComplianceGateResult, channel: Channel): ChannelPermission {
  return (
    result.permissions.find((p) => p.channel === channel) ?? {
      channel,
      allowed: false,
      requiresReview: true,
      reason: 'Channel has not been evaluated.',
    }
  );
}
