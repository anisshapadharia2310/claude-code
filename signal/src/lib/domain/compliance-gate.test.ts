import { describe, expect, it } from 'vitest';
import {
  Channel,
  ConsentRequirement,
  ConsentStatus,
  LawfulBasis,
  OptOutStatus,
  PhoneStatus,
  WhatsAppStatus,
} from '@prisma/client';
import { canUseChannel, evaluateComplianceGate, LEGAL_DISCLAIMER } from './compliance-gate';
import { makeComplianceRecord, makeContact, makeCountryRule } from './__fixtures__';

function gate(contactOverrides = {}, recordOverrides: object | null = {}, ruleOverrides = {}) {
  return evaluateComplianceGate({
    contact: makeContact(contactOverrides),
    record: recordOverrides === null ? null : makeComplianceRecord(recordOverrides),
    countryRule: makeCountryRule(ruleOverrides),
  });
}

describe('compliance gate - blocking', () => {
  it('blocks all outreach for a do-not-contact record', () => {
    const result = gate({ consentStatus: ConsentStatus.DO_NOT_CONTACT }, {
      consentStatus: ConsentStatus.DO_NOT_CONTACT,
    });
    expect(result.outcome).toBe('BLOCK');
    expect(result.passed).toBe(false);
    expect(result.allowedChannels).toEqual([]);
    expect(result.permissions.every((p) => !p.allowed)).toBe(true);
  });

  it('blocks all outreach on a global opt-out', () => {
    const result = gate({}, { optOutStatus: OptOutStatus.GLOBAL_OPT_OUT });
    expect(result.outcome).toBe('BLOCK');
  });

  it('blocks outreach when a free-text restriction says do not contact', () => {
    const result = gate({ communicationRestrictions: ['Do not contact - legal request'] });
    expect(result.outcome).toBe('BLOCK');
  });

  it('blocks only the opted-out channel, leaving others usable', () => {
    const result = gate({}, { optOutStatus: OptOutStatus.EMAIL_OPT_OUT });
    expect(canUseChannel(result, Channel.EMAIL).allowed).toBe(false);
    expect(canUseChannel(result, Channel.EMAIL).reason).toMatch(/opted out of email/);
    expect(canUseChannel(result, Channel.PHONE).allowed).toBe(true);
    expect(result.outcome).toBe('PASS');
  });

  it('blocks a channel listed in the contact-level blocked channels', () => {
    const result = gate({}, { blockedChannels: [Channel.PHONE] });
    expect(canUseChannel(result, Channel.PHONE).allowed).toBe(false);
    expect(canUseChannel(result, Channel.PHONE).reason).toMatch(/blocked channels/);
  });
});

describe('compliance gate - country configuration', () => {
  it('blocks a channel a country rule prohibits outright', () => {
    const result = gate({}, {}, { phoneRequirement: ConsentRequirement.CHANNEL_PROHIBITED });
    const phone = canUseChannel(result, Channel.PHONE);
    expect(phone.allowed).toBe(false);
    expect(phone.reason).toMatch(/prohibited by the configured rule/);
  });

  it('blocks a channel when recorded consent is weaker than the country requires', () => {
    const result = gate(
      { consentStatus: ConsentStatus.LEGITIMATE_INTEREST },
      { consentStatus: ConsentStatus.LEGITIMATE_INTEREST },
      { emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED },
    );
    const email = canUseChannel(result, Channel.EMAIL);
    expect(email.allowed).toBe(false);
    expect(email.reason).toMatch(/requires explicit opt in required/);
  });

  it('permits a channel once explicit opt-in is recorded', () => {
    const result = gate(
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN },
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN },
      { emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED },
    );
    expect(canUseChannel(result, Channel.EMAIL).allowed).toBe(true);
  });

  it('defaults WhatsApp to requiring explicit opt-in', () => {
    const result = gate({ whatsappStatus: WhatsAppStatus.AVAILABLE_NO_CONSENT });
    expect(canUseChannel(result, Channel.WHATSAPP).allowed).toBe(false);
  });

  it('permits WhatsApp for an explicitly opted-in contact', () => {
    const result = gate(
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN, whatsappStatus: WhatsAppStatus.AVAILABLE_OPTED_IN },
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN },
    );
    expect(canUseChannel(result, Channel.WHATSAPP).allowed).toBe(true);
  });

  it('blocks WhatsApp when the contact has opted out of it, even with explicit consent', () => {
    const result = gate(
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN, whatsappStatus: WhatsAppStatus.OPTED_OUT },
      { consentStatus: ConsentStatus.EXPLICIT_OPT_IN },
    );
    expect(canUseChannel(result, Channel.WHATSAPP).allowed).toBe(false);
  });
});

describe('compliance gate - incomplete records', () => {
  it('holds when a required field is missing', () => {
    const result = gate({}, { lawfulBasis: LawfulBasis.NOT_DETERMINED });
    expect(result.outcome).toBe('HOLD');
    expect(result.missingFields).toContain('Lawful basis');
    expect(result.warnings.join(' ')).toMatch(/incomplete/);
  });

  it('holds when no compliance record exists at all', () => {
    const result = gate({}, null);
    expect(result.outcome).toBe('HOLD');
    expect(result.warnings.join(' ')).toMatch(/No compliance record/);
  });

  it('holds when a country requires a privacy notice that was not provided', () => {
    const result = gate({}, { noticeProvided: false }, { noticeRequired: true });
    expect(result.outcome).toBe('HOLD');
    expect(result.missingFields).toContain('Privacy notice provided');
  });

  it('marks otherwise-permitted channels as requiring review while a record is incomplete', () => {
    const result = gate({}, { consentSource: null }, { requiredFields: ['consentSource'] });
    expect(result.outcome).toBe('HOLD');
    expect(canUseChannel(result, Channel.EMAIL).requiresReview).toBe(true);
  });
});

describe('compliance gate - reachability', () => {
  it('refuses email when there is no email address', () => {
    const result = gate({ workEmail: null });
    expect(canUseChannel(result, Channel.EMAIL).allowed).toBe(false);
    expect(canUseChannel(result, Channel.EMAIL).reason).toMatch(/No work email/);
  });

  it('refuses phone for a known wrong number but still permits email', () => {
    const result = gate({ phoneStatus: PhoneStatus.WRONG_NUMBER });
    expect(canUseChannel(result, Channel.PHONE).allowed).toBe(false);
    expect(canUseChannel(result, Channel.EMAIL).allowed).toBe(true);
    expect(result.outcome).toBe('PASS');
  });

  it('never encodes a legal conclusion without the counsel disclaimer', () => {
    expect(LEGAL_DISCLAIMER).toMatch(/qualified privacy counsel/);
  });
});
