/**
 * Compliance gate.
 *
 * Blocking is the point of this module, so most of these tests assert that
 * something is refused: an opted-out contact, a do-not-contact record, a
 * country-prohibited channel, WhatsApp without a documented opt-in, and an
 * incomplete record that must produce a hold rather than a priority.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMIN_LEGAL_WARNING, canUseChannel, channelBlockReason, evaluateCompliance,
} from '@/domain/compliance';
import { qualifyContact } from '@/domain/qualify';
import {
  daysAgo, makeAccount, makeCampaign, makeComplianceRecord, makeContact, makeCountryRule, NOW,
} from './factories';

function evaluate(options: {
  contact?: Parameters<typeof makeContact>[0];
  record?: Parameters<typeof makeComplianceRecord>[0] | null;
  rule?: Parameters<typeof makeCountryRule>[0] | null;
  campaignChannels?: Parameters<typeof makeCampaign>[0] extends never ? never : ('EMAIL' | 'PHONE' | 'WHATSAPP')[];
} = {}) {
  return evaluateCompliance({
    contact: makeContact(options.contact),
    record: options.record === null ? null : makeComplianceRecord(options.record),
    rule: options.rule === null ? null : makeCountryRule(options.rule),
    campaignChannels: options.campaignChannels,
    now: NOW,
  });
}

describe('a complete record clears the gate', () => {
  it('passes and lists the permitted channels', () => {
    const result = evaluate();
    expect(result.status).toBe('PASS');
    expect(result.allowedChannels).toContain('EMAIL');
    expect(result.allowedChannels).toContain('PHONE');
    expect(result.doNotContact).toBe(false);
  });
});

describe('do not contact', () => {
  it('blocks every channel and says so', () => {
    const result = evaluate({ contact: { consentStatus: 'DO_NOT_CONTACT' } });
    expect(result.status).toBe('BLOCKED');
    expect(result.doNotContact).toBe(true);
    expect(result.allowedChannels).toHaveLength(0);
    expect(result.summary).toContain('Do not contact');
    for (const channel of ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'] as const) {
      expect(canUseChannel(result, channel)).toBe(false);
    }
  });

  it('blocks on a global opt-out recorded against the compliance record', () => {
    const result = evaluate({ record: { optOutStatus: 'GLOBAL_OPT_OUT' } });
    expect(result.status).toBe('BLOCKED');
    expect(result.doNotContact).toBe(true);
  });

  it('rejects the contact outright, whatever the score', () => {
    const result = qualifyContact({
      account: makeAccount(),
      contact: makeContact({ consentStatus: 'DO_NOT_CONTACT' }),
      campaign: makeCampaign(),
      complianceRecord: makeComplianceRecord({ consentStatus: 'DO_NOT_CONTACT', optOutStatus: 'GLOBAL_OPT_OUT' }),
      countryRule: makeCountryRule(),
      now: NOW,
    });
    expect(result.decision.priority).toBe('REJECT');
    expect(result.decision.reasons[0]).toContain('do-not-contact');
  });
});

describe('channel-level opt-outs', () => {
  it('removes only the channel that was opted out of', () => {
    const result = evaluate({ record: { optOutStatus: 'EMAIL_OPT_OUT' } });
    expect(result.allowedChannels).not.toContain('EMAIL');
    expect(result.allowedChannels).toContain('PHONE');
    expect(channelBlockReason(result, 'EMAIL')).toContain('opted out of email');
  });

  it('honours a phone opt-out', () => {
    const result = evaluate({ record: { optOutStatus: 'PHONE_OPT_OUT' } });
    expect(result.allowedChannels).not.toContain('PHONE');
    expect(result.allowedChannels).toContain('EMAIL');
  });

  it('removes electronic channels for a general opt-out', () => {
    const result = evaluate({ contact: { consentStatus: 'OPT_OUT' } });
    expect(result.allowedChannels).not.toContain('EMAIL');
    expect(result.allowedChannels).not.toContain('WHATSAPP');
  });

  it('honours a free-text restriction on the contact', () => {
    const result = evaluate({ contact: { communicationRestrictions: ['NO PHONE - assistant screens calls'] } });
    expect(result.allowedChannels).not.toContain('PHONE');
    expect(channelBlockReason(result, 'PHONE')).toContain('restriction recorded');
  });
});

describe('country rules', () => {
  it('removes a channel the country policy prohibits', () => {
    const result = evaluate({
      contact: { whatsappStatus: 'AVAILABLE_OPTED_IN' },
      record: { allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'] },
      rule: { prohibitedChannels: ['WHATSAPP'] },
    });
    expect(result.allowedChannels).not.toContain('WHATSAPP');
    expect(channelBlockReason(result, 'WHATSAPP')).toContain('Prohibited');
  });

  it('holds when the country requires an explicit opt-in and none is recorded', () => {
    const result = evaluate({
      contact: { consentStatus: 'LEGITIMATE_INTEREST' },
      record: { consentStatus: 'LEGITIMATE_INTEREST', lawfulBasis: 'LEGITIMATE_INTEREST' },
      rule: { requiresExplicitOptIn: true },
    });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('explicit opt-in');
    expect(result.allowedChannels).not.toContain('EMAIL');
  });

  it('holds when the country requires a privacy notice that was not provided', () => {
    const result = evaluate({
      record: { noticeProvided: false },
      rule: { requiresNotice: true },
    });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('privacy notice provided');
  });

  it('holds when consent is older than the country validity window', () => {
    const result = evaluate({
      record: { consentDate: daysAgo(900) },
      rule: { consentValidityDays: 365 },
    });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('refreshed consent');
    expect(result.warnings.join(' ')).toContain('validity window');
  });

  it('falls back to a conservative default when no rule exists for the country', () => {
    const result = evaluate({ rule: null });
    expect(result.status).toBe('PASS');
    expect(result.allowedChannels).toContain('EMAIL');
    expect(result.allowedChannels).not.toContain('WHATSAPP');
  });
});

describe('WhatsApp needs its own documented permission', () => {
  it('blocks WhatsApp without an opt-in', () => {
    const result = evaluate({
      contact: { whatsappStatus: 'AVAILABLE_NO_CONSENT' },
      record: { allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'] },
    });
    expect(result.allowedChannels).not.toContain('WHATSAPP');
    expect(channelBlockReason(result, 'WHATSAPP')).toContain('separate documented opt-in');
  });

  it('permits WhatsApp with a recorded opt-in', () => {
    const result = evaluate({
      contact: { whatsappStatus: 'AVAILABLE_OPTED_IN' },
      record: { allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'] },
    });
    expect(result.allowedChannels).toContain('WHATSAPP');
  });

  it('blocks WhatsApp when the contact has no WhatsApp number', () => {
    const result = evaluate({
      contact: { whatsappStatus: 'NOT_AVAILABLE' },
      record: { allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'] },
    });
    expect(channelBlockReason(result, 'WHATSAPP')).toContain('No WhatsApp number');
  });
});

describe('incomplete records produce a hold, never a priority', () => {
  it('holds when no compliance record exists at all', () => {
    const result = evaluate({ record: null });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('compliance record');
  });

  it('holds when the lawful basis is undetermined', () => {
    const result = evaluate({ record: { lawfulBasis: 'NOT_DETERMINED' } });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('lawful basis');
  });

  it('holds when consent was never captured', () => {
    const result = evaluate({
      contact: { consentStatus: 'NOT_CAPTURED' },
      record: { consentStatus: 'NOT_CAPTURED', lawfulBasis: 'LEGITIMATE_INTEREST' },
    });
    expect(result.status).toBe('HOLD');
    expect(result.missingFields).toContain('consent status');
  });

  it('assigns COMPLIANCE_HOLD rather than a working priority', () => {
    const result = qualifyContact({
      account: makeAccount(),
      contact: makeContact(),
      campaign: makeCampaign(),
      complianceRecord: makeComplianceRecord({ lawfulBasis: 'NOT_DETERMINED' }),
      countryRule: makeCountryRule(),
      now: NOW,
    });
    expect(result.decision.priority).toBe('COMPLIANCE_HOLD');
    expect(result.decision.humanReviewRequired).toBe(true);
  });
});

describe('unreachable contacts', () => {
  it('blocks email when the address bounced', () => {
    const result = evaluate({ contact: { emailStatus: 'BOUNCED' } });
    expect(result.allowedChannels).not.toContain('EMAIL');
    expect(channelBlockReason(result, 'EMAIL')).toContain('bounced');
  });

  it('blocks phone on a do-not-call listing', () => {
    const result = evaluate({ contact: { phoneStatus: 'DO_NOT_CALL' } });
    expect(result.allowedChannels).not.toContain('PHONE');
    expect(channelBlockReason(result, 'PHONE')).toContain('do-not-call');
  });

  it('leaves email available when the phone number is missing', () => {
    const result = evaluate({ contact: { phoneNumber: null, phoneStatus: 'MISSING' } });
    expect(result.allowedChannels).toContain('EMAIL');
    expect(result.status).toBe('PASS');
  });
});

describe('campaign-level channel restriction', () => {
  it('removes a channel the campaign has not enabled', () => {
    const result = evaluate({ campaignChannels: ['EMAIL'] });
    expect(result.allowedChannels).toEqual(['EMAIL']);
    expect(channelBlockReason(result, 'PHONE')).toContain('not enabled for this campaign');
  });
});

describe('the administrator warning is part of the product', () => {
  it('states that counsel must confirm the rules', () => {
    expect(ADMIN_LEGAL_WARNING).toContain('qualified privacy counsel');
  });
});
