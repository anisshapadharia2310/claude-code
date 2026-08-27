import { describe, expect, it } from 'vitest';
import {
  DataConfidence,
  EmailStatus,
  EventType,
  PhoneStatus,
  Priority,
  RoleCategory,
  Seniority,
  TriggerVerification,
} from '@prisma/client';
import { scoreContact } from './engine';
import { DEFAULT_WEIGHTS, componentMaxima, totalWeight, validateWeights } from './weights';
import { evaluateComplianceGate } from '../compliance-gate';
import {
  LONG_AGO,
  NOW,
  makeAccount,
  makeCampaign,
  makeComplianceRecord,
  makeContact,
  makeCountryRule,
} from '../__fixtures__';
import type { EngagementEventInput } from '../types';

function compliance(contactOverrides = {}, recordOverrides = {}) {
  return evaluateComplianceGate({
    contact: makeContact(contactOverrides),
    record: makeComplianceRecord(recordOverrides),
    countryRule: makeCountryRule(),
  });
}

function score(opts: {
  account?: Parameters<typeof makeAccount>[0];
  contact?: Parameters<typeof makeContact>[0];
  campaign?: Parameters<typeof makeCampaign>[0];
  record?: Parameters<typeof makeComplianceRecord>[0];
  events?: EngagementEventInput[];
  whyThisContact?: string | null;
}) {
  const contact = makeContact(opts.contact);
  return scoreContact({
    account: makeAccount(opts.account),
    contact,
    campaign: makeCampaign(opts.campaign),
    compliance: evaluateComplianceGate({
      contact,
      record: makeComplianceRecord(opts.record),
      countryRule: makeCountryRule(),
    }),
    events: opts.events ?? [],
    whyThisContact:
      'whyThisContact' in opts
        ? opts.whyThisContact
        : 'Owns the CX transformation programme announced in Q1.',
    now: NOW,
  });
}

describe('scoring weights', () => {
  it('the default model totals exactly 100 points', () => {
    expect(totalWeight(DEFAULT_WEIGHTS as never)).toBe(100);
  });

  it('allocates the documented maximum to each component', () => {
    expect(componentMaxima(DEFAULT_WEIGHTS as never)).toEqual({
      fit: 25,
      roleRelevance: 25,
      trigger: 20,
      engagement: 15,
      dataQuality: 10,
      attendance: 5,
    });
  });

  it('accepts a custom model that still totals 100', () => {
    const custom = structuredClone(DEFAULT_WEIGHTS) as never as typeof DEFAULT_WEIGHTS;
    const reweighted = {
      ...custom,
      companyFit: { ...custom.companyFit, industryMatch: 10, geographyMatch: 3 },
    };
    expect(validateWeights(reweighted).valid).toBe(true);
  });

  it('rejects a model that does not total 100 and reports the actual total', () => {
    const broken = structuredClone(DEFAULT_WEIGHTS) as never as typeof DEFAULT_WEIGHTS;
    const result = validateWeights({
      ...broken,
      companyFit: { ...broken.companyFit, industryMatch: 20 },
    });
    expect(result.valid).toBe(false);
    expect(result.total).toBe(112);
    expect(result.errors.join(' ')).toMatch(/must total exactly 100/);
  });
});

describe('component A - company fit', () => {
  it('awards the full 25 points to a perfectly matched account', () => {
    expect(score({}).components.fit).toBe(25);
  });

  it('withholds industry and geography points when the account is out of scope', () => {
    const result = score({ account: { industry: 'Hospitality', subIndustry: null, country: 'Japan' } });
    const codes = Object.fromEntries(result.explanation.map((l) => [l.code, l.points]));
    expect(codes['fit.industry']).toBe(0);
    expect(codes['fit.geography']).toBe(0);
  });

  it('treats competitor technology as a displacement opportunity worth slightly less', () => {
    const result = score({
      account: { existingTechnology: [], competitorTechnology: ['Genesys'] },
    });
    const line = result.explanation.find((l) => l.code === 'fit.technology')!;
    expect(line.points).toBe(3);
    expect(line.reason).toMatch(/displacement opportunity/);
  });
});

describe('component B - contact-role relevance', () => {
  it('gives a corroborated direct owner the full 25 points', () => {
    expect(score({}).components.roleRelevance).toBe(25);
  });

  it('does NOT award ownership points for a bare "customer" keyword in the title', () => {
    // A sales-side "Customer Account Executive" is the exact false positive the
    // agency's old keyword filter produced.
    const result = score({
      contact: {
        jobTitle: 'Customer Account Executive',
        normalizedJobTitle: 'customer account executive',
        department: 'Sales',
        jobFunction: 'Sales',
        roleCategory: RoleCategory.PERIPHERAL,
        seniority: Seniority.INDIVIDUAL_CONTRIBUTOR,
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
      },
    });
    const directOwner = result.explanation.find((l) => l.code === 'role.directOwner')!;
    expect(directOwner.points).toBe(0);
    expect(directOwner.reason).toMatch(/keyword is not proof of relevance/);
    expect(result.components.roleRelevance).toBe(0);
  });

  it('records explicitly that seniority alone does not qualify a contact', () => {
    const result = score({
      contact: {
        roleCategory: RoleCategory.PERIPHERAL,
        seniority: Seniority.C_LEVEL,
        department: 'Legal',
        jobFunction: 'Legal',
        normalizedJobTitle: 'chief legal officer',
        directProblemResponsibility: false,
      },
    });
    const seniorityLine = result.explanation.find((l) => l.code === 'role.seniority')!;
    expect(seniorityLine.points).toBe(3);
    expect(result.components.roleRelevance).toBeLessThan(18);
    expect(result.priority).not.toBe(Priority.P1);
  });
});

describe('component C - business triggers', () => {
  it('withholds every trigger point when research marked the trigger false', () => {
    const result = score({ account: { triggerVerification: TriggerVerification.FALSE_POSITIVE } });
    expect(result.components.trigger).toBe(0);
  });

  it('scales hiring points with the number of relevant open roles', () => {
    expect(
      score({ account: { relevantOpenJobPostings: 1 } }).explanation.find(
        (l) => l.code === 'trigger.hiring',
      )!.points,
    ).toBe(3);
    expect(
      score({ account: { relevantOpenJobPostings: 0 } }).explanation.find(
        (l) => l.code === 'trigger.hiring',
      )!.points,
    ).toBe(0);
  });
});

describe('component E - data quality', () => {
  it('still scores a contact with no phone number, using email as the channel', () => {
    const result = score({
      contact: { phoneNumber: null, phoneStatus: PhoneStatus.MISSING },
      record: { allowedChannels: ['EMAIL'] as never },
    });
    const phoneLine = result.explanation.find((l) => l.code === 'dq.phone')!;
    expect(phoneLine.points).toBe(0);
    expect(phoneLine.reason).toMatch(/nurture by email/);
    expect(result.compliance.allowedChannels).toContain('EMAIL');
    expect(result.playbook.recommendedChannel).toBe('EMAIL');
    expect(result.playbook.recommendedNextAction).toMatch(/No callable number/);
  });
});

describe('priority assignment', () => {
  it('assigns P1 when the score, both sub-minimums, both gates and a justification are all satisfied', () => {
    const result = score({});
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.components.roleRelevance).toBeGreaterThanOrEqual(18);
    expect(result.components.dataQuality).toBeGreaterThanOrEqual(7);
    expect(result.priority).toBe(Priority.P1);
  });

  it('holds a high-scoring contact at P2 when no "why this contact" note exists', () => {
    const result = score({ whyThisContact: null });
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.priority).toBe(Priority.P2);
    expect(result.priorityReasons.join(' ')).toMatch(/requires a written "why this contact"/);
  });

  it('holds a high-scoring contact at P2 when role relevance is below 18', () => {
    const result = score({
      contact: {
        roleCategory: RoleCategory.TECHNICAL_EVALUATOR,
        directProblemResponsibility: false,
        department: 'Information Technology',
        jobFunction: 'Information Technology',
        normalizedJobTitle: 'director of information technology',
      },
    });
    expect(result.components.roleRelevance).toBeLessThan(18);
    expect(result.priority).not.toBe(Priority.P1);
  });

  it('holds a high-scoring contact at P2 when data quality is below 7', () => {
    const result = score({
      contact: {
        emailStatus: EmailStatus.UNVERIFIED,
        phoneStatus: PhoneStatus.UNVERIFIED,
        roleConfidence: DataConfidence.LOW,
        contactSource: null,
        timeZone: null,
      },
    });
    expect(result.components.dataQuality).toBeLessThan(7);
    expect(result.priority).not.toBe(Priority.P1);
  });

  it('rejects a contact whose relevance gate fails', () => {
    const result = score({ contact: { isDuplicate: true } });
    expect(result.priority).toBe(Priority.REJECT);
    expect(result.priorityReasons.join(' ')).toMatch(/duplicate/i);
  });

  it('rejects a contact scoring below 40', () => {
    const result = score({
      account: {
        industry: 'Hospitality',
        subIndustry: null,
        country: 'Japan',
        namedAccountStatus: false,
        existingTechnology: [],
        relevantOpenJobPostings: 0,
        transformationActivity: false,
        expansionActivity: false,
        mergerOrAcquisitionActivity: false,
        leadershipChange: false,
        regulatoryPressure: false,
        publiclyStatedPriority: false,
        recentBusinessTrigger: null,
      },
      contact: {
        roleCategory: RoleCategory.PERIPHERAL,
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
        department: 'Sales',
        jobFunction: 'Sales',
        normalizedJobTitle: 'customer account executive',
        seniority: Seniority.INDIVIDUAL_CONTRIBUTOR,
      },
    });
    expect(result.totalScore).toBeLessThan(40);
    expect(result.priority).toBe(Priority.REJECT);
  });

  it('places mid-scoring contacts in the P2 and P3 bands', () => {
    const p3 = score({
      account: {
        relevantOpenJobPostings: 0,
        transformationActivity: false,
        leadershipChange: false,
        regulatoryPressure: false,
        publiclyStatedPriority: false,
        namedAccountStatus: false,
        recentBusinessTrigger: null,
      },
      contact: {
        roleCategory: RoleCategory.OPERATIONAL_OWNER,
        directProblemResponsibility: false,
        ownsBudget: false,
        roleConfidence: DataConfidence.MEDIUM,
        emailStatus: EmailStatus.UNVERIFIED,
        phoneStatus: PhoneStatus.UNVERIFIED,
      },
    });
    expect(p3.totalScore).toBeGreaterThanOrEqual(40);
    expect(p3.totalScore).toBeLessThan(60);
    expect(p3.priority).toBe(Priority.P3);
  });
});

describe('post-webinar engagement', () => {
  const events = (types: EventType[]): EngagementEventInput[] =>
    types.map((eventType) => ({ eventType, eventDate: new Date('2026-04-15T15:00:00Z') }));

  it('never lets the total exceed 100', () => {
    const result = score({
      events: events([
        EventType.WEBINAR_REGISTERED,
        EventType.WEBINAR_ATTENDED,
        EventType.WEBINAR_ATTENDANCE_80_PERCENT,
        EventType.STAYED_FOR_QA,
        EventType.POLL_ANSWERED,
        EventType.QUESTION_ASKED,
        EventType.RESOURCE_DOWNLOADED,
        EventType.CTA_CLICKED,
        EventType.REPLAY_WATCHED,
        EventType.MEETING_REQUESTED,
      ]),
    });
    expect(result.engagementBonus).toBeGreaterThan(0);
    expect(result.totalScore).toBe(100);
  });

  it('counts only the highest attendance-duration tier', () => {
    const result = score({
      events: events([
        EventType.WEBINAR_ATTENDANCE_50_PERCENT,
        EventType.WEBINAR_ATTENDANCE_75_PERCENT,
        EventType.WEBINAR_ATTENDANCE_80_PERCENT,
      ]),
    });
    // 20 for the 80% tier only, not 10 + 15 + 20.
    expect(result.engagementBonus).toBe(20);
  });
});

describe('explainability', () => {
  it('produces a reason for every criterion, including those that scored zero', () => {
    const result = score({ account: { industry: 'Hospitality' } });
    expect(result.explanation.length).toBeGreaterThanOrEqual(26);
    for (const line of result.explanation) {
      expect(line.reason.length).toBeGreaterThan(0);
      expect(line.points).toBeLessThanOrEqual(line.max);
    }
  });

  it('flags contacts near the P1 threshold for human review', () => {
    const result = score({
      contact: { roleConfidence: DataConfidence.LOW },
    });
    expect(result.humanReviewRequired).toBe(true);
    expect(result.humanReviewReasons.join(' ')).toMatch(/role confidence/i);
  });

  it('flags an unverified trigger for research review', () => {
    const result = score({ account: { triggerVerification: TriggerVerification.UNVERIFIED } });
    expect(result.humanReviewReasons.join(' ')).toMatch(/not been verified/);
  });

  it('marks stale records as failing the relevance gate', () => {
    const result = score({ contact: { lastVerifiedAt: LONG_AGO } });
    const check = result.relevance.checks.find((c) => c.key === 'dataCurrent')!;
    expect(check.passed).toBe(false);
    expect(result.priority).toBe(Priority.REJECT);
  });
});

describe('old method versus SIGNAL', () => {
  it('marks a contact the old keyword filter would also have picked', () => {
    expect(score({}).surfaceLevelMatch).toBe(true);
  });

  it('shows the old filter selecting a contact SIGNAL rejects', () => {
    const result = score({
      contact: {
        normalizedJobTitle: 'customer account executive',
        department: 'Sales',
        jobFunction: 'Sales',
        roleCategory: RoleCategory.PERIPHERAL,
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
        seniority: Seniority.INDIVIDUAL_CONTRIBUTOR,
      },
    });
    expect(result.surfaceLevelMatch).toBe(true);
    expect(result.priority).toBe(Priority.REJECT);
  });
});
