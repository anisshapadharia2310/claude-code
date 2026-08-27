import { describe, expect, it } from 'vitest';
import { ConsentStatus, RoleCategory } from '@prisma/client';
import { evaluateRelevanceGate } from './relevance-gate';
import { evaluateComplianceGate } from './compliance-gate';
import {
  LONG_AGO,
  NOW,
  makeAccount,
  makeCampaign,
  makeComplianceRecord,
  makeContact,
  makeCountryRule,
} from './__fixtures__';
import type { ContactInput } from './types';

function gate(
  contactOverrides: Partial<ContactInput> = {},
  accountOverrides = {},
  recordOverrides = {},
) {
  const contact = makeContact(contactOverrides);
  const compliance = evaluateComplianceGate({
    contact,
    record: makeComplianceRecord(recordOverrides),
    countryRule: makeCountryRule(),
  });
  return evaluateRelevanceGate({
    account: makeAccount(accountOverrides),
    contact,
    campaign: makeCampaign(),
    compliance,
    now: NOW,
  });
}

function check(result: ReturnType<typeof gate>, key: string) {
  return result.checks.find((c) => c.key === key)!;
}

describe('relevance gate', () => {
  it('runs all eight mandatory checks', () => {
    const result = gate();
    expect(result.checks.map((c) => c.key)).toEqual([
      'industry',
      'geography',
      'roleRelated',
      'ownership',
      'dataCurrent',
      'permission',
      'notOptedOut',
      'notDuplicate',
    ]);
  });

  it('passes a well-qualified contact', () => {
    const result = gate();
    expect(result.passed).toBe(true);
    expect(result.roleEligibleForP1).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('fails when the company is outside the target industry', () => {
    const result = gate({}, { industry: 'Hospitality', subIndustry: null });
    expect(check(result, 'industry').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails when the company is outside the target geography', () => {
    const result = gate({ country: 'Japan' }, { country: 'Japan' });
    expect(check(result, 'geography').passed).toBe(false);
  });

  it('fails a peripheral role even when every firmographic check passes', () => {
    const result = gate({ roleCategory: RoleCategory.PERIPHERAL });
    expect(check(result, 'roleRelated').passed).toBe(false);
    expect(result.roleEligibleForP1).toBe(false);
  });

  it('fails an unknown role category and says review is needed', () => {
    const result = gate({ roleCategory: RoleCategory.UNKNOWN });
    const roleCheck = check(result, 'roleRelated');
    expect(roleCheck.passed).toBe(false);
    expect(roleCheck.detail).toMatch(/research review required/i);
  });

  it('fails a contact who neither owns nor influences the problem', () => {
    const result = gate({
      directProblemResponsibility: false,
      ownsBudget: false,
      influencesDecision: false,
    });
    expect(check(result, 'ownership').passed).toBe(false);
    expect(result.roleEligibleForP1).toBe(false);
  });

  it('fails a stale record', () => {
    const result = gate({ lastVerifiedAt: LONG_AGO });
    expect(check(result, 'dataCurrent').passed).toBe(false);
    expect(check(result, 'dataCurrent').detail).toMatch(/limit 180/);
  });

  it('fails a record that has never been verified', () => {
    const result = gate({ lastVerifiedAt: null });
    expect(check(result, 'dataCurrent').passed).toBe(false);
    expect(check(result, 'dataCurrent').detail).toMatch(/No verification date/);
  });

  it('fails when no communication channel is permitted', () => {
    const result = gate(
      { workEmail: null, phoneNumber: null },
      {},
      { allowedChannels: [], blockedChannels: [] },
    );
    expect(check(result, 'permission').passed).toBe(false);
  });

  it('fails an opted-out contact', () => {
    const result = gate({ consentStatus: ConsentStatus.OPT_OUT }, {}, { consentStatus: ConsentStatus.OPT_OUT });
    expect(check(result, 'notOptedOut').passed).toBe(false);
  });

  it('fails a duplicate record', () => {
    const result = gate({ isDuplicate: true });
    expect(check(result, 'notDuplicate').passed).toBe(false);
  });

  it('treats every check as blocking, so one failure fails the gate', () => {
    const result = gate({ isDuplicate: true });
    expect(result.checks.every((c) => c.blocking)).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
  });
});
