/**
 * Scoring engine.
 *
 * Covers each band, the caps, the weight validation rules and the priority
 * thresholds - including the cases the whole product exists to get right:
 * a keyword match must not qualify anybody, and seniority alone must never
 * produce a P1.
 */
import { describe, expect, it } from 'vitest';
import { computeScore } from '@/domain/scoring';
import { decidePriority } from '@/domain/priority';
import { evaluateCompliance } from '@/domain/compliance';
import { runRelevanceGate } from '@/domain/relevance-gate';
import { qualifyContact } from '@/domain/qualify';
import { computeEngagementBonus, POST_WEBINAR_POINTS } from '@/domain/engagement';
import { cloneDefaultWeights, DEFAULT_WEIGHTS, validateWeights } from '@/domain/weights';
import {
  makeAccount, makeCampaign, makeComplianceRecord, makeContact, makeCountryRule, makeEvent, NOW, daysAgo,
} from './factories';

function score(options: {
  account?: Parameters<typeof makeAccount>[0];
  contact?: Parameters<typeof makeContact>[0];
  campaign?: Parameters<typeof makeCampaign>[0];
  events?: ReturnType<typeof makeEvent>[];
  historicalEvents?: ReturnType<typeof makeEvent>[];
  record?: Parameters<typeof makeComplianceRecord>[0] | null;
} = {}) {
  const account = makeAccount(options.account);
  const contact = makeContact(options.contact);
  const campaign = makeCampaign(options.campaign);
  const compliance = evaluateCompliance({
    contact,
    record: options.record === null ? null : makeComplianceRecord(options.record),
    rule: makeCountryRule(),
    campaignChannels: campaign.allowedChannels,
    now: NOW,
  });
  const gate = runRelevanceGate({ account, contact, campaign, compliance, now: NOW });
  return computeScore({
    account, contact, campaign,
    events: options.events ?? [],
    historicalEvents: options.historicalEvents ?? [],
    compliance, gate, now: NOW,
  });
}

describe('band A - company fit', () => {
  it('awards the full 25 for a perfectly matching account', () => {
    const result = score();
    expect(result.fitScore).toBe(25);
  });

  it('withholds the industry points when the industry is not targeted', () => {
    const result = score({ account: { industry: 'Mining', subIndustry: null } });
    expect(result.fitScore).toBe(17);
    // 25 minus the 8 industry points.
    const award = result.breakdown.bands[0]!.awards.find((item) => item.code === 'A_INDUSTRY');
    expect(award?.points).toBe(0);
    expect(award?.evidence).toContain('not among the campaign targets');
  });

  it('credits a matching sub-industry when the industry itself is not listed', () => {
    const result = score({ account: { industry: 'Financial Services', subIndustry: 'Retail Banking' } });
    expect(result.fitScore).toBe(25);
  });

  it('credits competitor technology as a displacement signal', () => {
    const result = score({ account: { existingTechnology: [], competitorTechnology: ['Zendesk'] } });
    const award = result.breakdown.bands[0]!.awards.find((item) => item.code === 'A_TECHNOLOGY');
    expect(award?.points).toBe(4);
    expect(award?.evidence).toContain('competing technology');
  });
});

describe('band B - role relevance, the anti-keyword band', () => {
  it('awards 25 to a confirmed direct owner with budget', () => {
    expect(score().roleRelevanceScore).toBe(25);
  });

  it('gives a customer account executive nothing for ownership', () => {
    const result = score({
      contact: {
        jobTitle: 'Senior Customer Account Executive',
        normalizedJobTitle: 'senior customer account executive',
        department: 'Sales',
        seniority: 'SENIOR_INDIVIDUAL',
        roleCategory: 'PERIPHERAL',
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
        decisionRole: 'UNKNOWN',
      },
    });
    expect(result.roleRelevanceScore).toBe(0);
  });

  it('gives a customer insights analyst nothing for ownership', () => {
    const result = score({
      contact: {
        jobTitle: 'Customer Insights Analyst',
        normalizedJobTitle: 'customer insights analyst',
        department: 'Marketing',
        seniority: 'INDIVIDUAL',
        roleCategory: 'PERIPHERAL',
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
      },
    });
    const owner = result.breakdown.bands[1]!.awards.find((item) => item.code === 'B_DIRECT_OWNER');
    expect(owner?.points).toBe(0);
    expect(result.roleRelevanceScore).toBe(0);
  });

  it('caps an operational owner below the P1 role minimum', () => {
    // Runs the function but is not accountable for it: 8 + 3 + 2 = 13, under 18.
    const result = score({
      contact: {
        jobTitle: 'Customer Service Team Leader',
        normalizedJobTitle: 'customer service team leader',
        seniority: 'SENIOR_MANAGER',
        roleCategory: 'OPERATIONAL_OWNER',
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: true,
      },
    });
    expect(result.roleRelevanceScore).toBe(13);
    expect(result.roleRelevanceScore).toBeLessThan(DEFAULT_WEIGHTS.thresholds.p1MinRoleRelevance);
  });

  it('does not award ownership points on seniority alone', () => {
    const result = score({
      contact: {
        jobTitle: 'Chief Financial Officer',
        normalizedJobTitle: 'chief financial officer',
        department: 'Finance',
        seniority: 'C_LEVEL',
        roleCategory: 'PERIPHERAL',
        directProblemResponsibility: false,
        ownsBudget: true,
        influencesDecision: true,
      },
    });
    const direct = result.breakdown.bands[1]!.awards.find((item) => item.code === 'B_DIRECT_OWNER');
    const operational = result.breakdown.bands[1]!.awards.find((item) => item.code === 'B_OPERATIONAL_OWNER');
    expect(direct?.points).toBe(0);
    expect(operational?.points).toBe(0);
  });
});

describe('band C - business trigger', () => {
  it('scores the recorded triggers', () => {
    // hiring 5 + transformation 5 + expansion 3 + leadership 2 + regulatory 3 + stated priority 2
    expect(score().triggerScore).toBe(20);
  });

  it('scores zero when nothing is happening', () => {
    const result = score({
      account: {
        relevantOpenJobPostings: 0, transformationActivity: false, expansionActivity: false,
        mergerOrAcquisitionActivity: false, leadershipChange: false, regulatoryPressure: false,
        publiclyStatedPriority: null, recentBusinessTrigger: null, triggerVerification: 'NONE',
      },
    });
    expect(result.triggerScore).toBe(0);
  });

  it('discards a stated priority a researcher marked a false positive', () => {
    const result = score({ account: { triggerVerification: 'FALSE_POSITIVE' } });
    const award = result.breakdown.bands[2]!.awards.find((item) => item.code === 'C_STATED_PRIORITY');
    expect(award?.points).toBe(0);
    expect(award?.evidence).toContain('false positive');
  });
});

describe('band D and E', () => {
  it('caps engagement at the band maximum', () => {
    const result = score({
      events: [
        makeEvent('POSITIVE_EMAIL_REPLY'), makeEvent('WHITEPAPER_DOWNLOADED'),
        makeEvent('WEBINAR_REGISTERED'), makeEvent('CTA_CLICKED'),
      ],
      historicalEvents: [makeEvent('WEBINAR_ATTENDED', { campaignId: 'camp-other' })],
    });
    expect(result.engagementScore).toBe(15);
  });

  it('awards full data quality for a verified, sourced, consented record', () => {
    expect(score().dataQualityScore).toBe(10);
  });

  it('still scores a contact with no phone number, using email as the channel', () => {
    const result = score({
      contact: { phoneNumber: null, phoneStatus: 'MISSING' },
      record: { allowedChannels: ['EMAIL'] },
    });
    expect(result.dataQualityScore).toBe(8);
    const award = result.breakdown.bands[4]!.awards.find((item) => item.code === 'E_VALID_PHONE');
    expect(award?.evidence).toContain('Email remains available');
  });
});

describe('band F - attendance likelihood', () => {
  it('separates attendance likelihood from commercial importance', () => {
    const result = score();
    // A perfect commercial fit with no attendance evidence still scores low here.
    expect(result.attendanceLikelihoodScore).toBeLessThanOrEqual(1);
    expect(result.fitScore).toBe(25);
  });

  it('credits early registration and prior attendance', () => {
    const campaign = makeCampaign();
    const result = score({
      events: [makeEvent('WEBINAR_REGISTERED', { eventDate: daysAgo(1) })],
      historicalEvents: [makeEvent('WEBINAR_ATTENDED', { campaignId: 'camp-other' })],
      campaign: { eventDate: campaign.eventDate },
    });
    expect(result.attendanceLikelihoodScore).toBeGreaterThanOrEqual(3);
  });
});

describe('post-event engagement bonus', () => {
  it('uses the documented point values', () => {
    expect(POST_WEBINAR_POINTS.MEETING_REQUESTED).toBe(20);
    expect(POST_WEBINAR_POINTS.WEBINAR_ATTENDANCE_80_PERCENT).toBe(20);
    expect(POST_WEBINAR_POINTS.QUESTION_ASKED).toBe(10);
    expect(POST_WEBINAR_POINTS.CTA_CLICKED).toBe(10);
  });

  it('counts only the highest attendance tier reached', () => {
    const bonus = computeEngagementBonus([
      makeEvent('WEBINAR_ATTENDANCE_50_PERCENT'),
      makeEvent('WEBINAR_ATTENDANCE_75_PERCENT'),
      makeEvent('WEBINAR_ATTENDANCE_80_PERCENT'),
    ]);
    expect(bonus.points).toBe(20);
    expect(bonus.entries.filter((entry) => entry.suppressedReason).length).toBe(2);
  });

  it('does not count registration twice', () => {
    const bonus = computeEngagementBonus([makeEvent('WEBINAR_REGISTERED')]);
    expect(bonus.points).toBe(0);
    expect(bonus.entries[0]!.suppressedReason).toContain('band D');
  });

  it('never lets the total exceed 100', () => {
    const result = score({
      events: [
        makeEvent('POSITIVE_EMAIL_REPLY'), makeEvent('WHITEPAPER_DOWNLOADED'),
        makeEvent('WEBINAR_REGISTERED'), makeEvent('CTA_CLICKED'), makeEvent('WEBINAR_ATTENDED'),
        makeEvent('WEBINAR_ATTENDANCE_80_PERCENT'), makeEvent('STAYED_FOR_QA'),
        makeEvent('POLL_ANSWERED'), makeEvent('QUESTION_ASKED'), makeEvent('RESOURCE_DOWNLOADED'),
        makeEvent('REPLAY_WATCHED'), makeEvent('MEETING_REQUESTED'),
      ],
    });
    expect(result.totalScore).toBe(100);
    expect(result.breakdown.cappedAt100).toBe(true);
  });
});

describe('every score is explainable', () => {
  it('gives every component evidence and a source field, awarded or not', () => {
    const result = score();
    const awards = result.breakdown.bands.flatMap((band) => band.awards);
    expect(awards.length).toBe(31);
    for (const award of awards) {
      expect(award.evidence.length).toBeGreaterThan(10);
      expect(award.sourceFields.length).toBeGreaterThan(0);
    }
  });

  it('band scores add up to the total base score', () => {
    const result = score();
    const sum = result.breakdown.bands.reduce((total, band) => total + band.score, 0);
    expect(sum).toBe(result.breakdown.baseScore);
  });
});

describe('weight validation', () => {
  it('accepts the default model', () => {
    expect(validateWeights(DEFAULT_WEIGHTS).valid).toBe(true);
    expect(validateWeights(DEFAULT_WEIGHTS).total).toBe(100);
  });

  it('rejects weights that do not add up to 100', () => {
    const weights = cloneDefaultWeights();
    weights.componentMax.A_INDUSTRY = 12;
    weights.bandMax.A = 29;
    const result = validateWeights(weights);
    expect(result.valid).toBe(false);
    expect(result.total).toBe(104);
    expect(result.issues.some((issue) => issue.message.includes('add up to 100'))).toBe(true);
  });

  it('rejects a band whose components disagree with its maximum', () => {
    const weights = cloneDefaultWeights();
    weights.componentMax.C_HIRING = 8;
    const result = validateWeights(weights);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'bandMax.C')).toBe(true);
  });

  it('rejects thresholds that are not increasing', () => {
    const weights = cloneDefaultWeights();
    weights.thresholds.p2 = 90;
    expect(validateWeights(weights).valid).toBe(false);
  });

  it('rejects a P1 role minimum above the band maximum', () => {
    const weights = cloneDefaultWeights();
    weights.thresholds.p1MinRoleRelevance = 30;
    expect(validateWeights(weights).valid).toBe(false);
  });
});

describe('priority rules', () => {
  const qualify = (options: Parameters<typeof qualifyContact>[0] extends never ? never : {
    account?: Parameters<typeof makeAccount>[0];
    contact?: Parameters<typeof makeContact>[0];
    events?: ReturnType<typeof makeEvent>[];
    whyThisContact?: string | null;
    approved?: boolean;
  } = {}) => qualifyContact({
    account: makeAccount(options.account),
    contact: makeContact(options.contact),
    campaign: makeCampaign(),
    events: options.events ?? [],
    complianceRecord: makeComplianceRecord(),
    countryRule: makeCountryRule(),
    whyThisContact: options.whyThisContact ?? null,
    humanReviewApproved: options.approved ?? false,
    now: NOW,
  });

  it('assigns P1 to a confirmed owner at a triggered account', () => {
    const result = qualify();
    expect(result.score.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.decision.priority).toBe('P1');
  });

  it('requires a written justification and approval before a P1 is settled', () => {
    const pending = qualify();
    expect(pending.decision.humanReviewRequired).toBe(true);
    expect(pending.decision.humanReviewReasons.join(' ')).toContain('why this contact');

    const approved = qualify({
      whyThisContact: 'Owns the customer experience programme and the migration trigger is verified.',
      approved: true,
    });
    expect(approved.decision.priority).toBe('P1');
    expect(approved.decision.humanReviewRequired).toBe(false);
  });

  it('drops a strong scorer out of P1 when role relevance is short', () => {
    const result = qualify({
      contact: {
        jobTitle: 'Customer Service Team Leader',
        normalizedJobTitle: 'customer service team leader',
        roleCategory: 'OPERATIONAL_OWNER',
        seniority: 'SENIOR_MANAGER',
        directProblemResponsibility: false,
      },
    });
    expect(result.score.roleRelevanceScore).toBeLessThan(18);
    expect(result.decision.priority).not.toBe('P1');
  });

  it('drops out of P1 when data quality is below the floor', () => {
    const result = qualify({
      contact: {
        emailStatus: 'UNVERIFIED', phoneStatus: 'UNVERIFIED',
        contactSource: null, lastVerifiedAt: null,
      },
      whyThisContact: 'Owns the programme and the trigger is verified beyond doubt.',
      approved: true,
    });
    expect(result.score.dataQualityScore).toBeLessThan(7);
    expect(result.decision.priority).not.toBe('P1');
  });

  it('places a mid scorer in P2 and a weak scorer in P3', () => {
    const p2 = qualify({
      account: {
        relevantOpenJobPostings: 0, transformationActivity: false, leadershipChange: false,
      },
    });
    expect(p2.score.totalScore).toBeGreaterThanOrEqual(60);
    expect(p2.score.totalScore).toBeLessThan(80);
    expect(p2.decision.priority).toBe('P2');

    const p3 = qualify({
      account: {
        namedAccountStatus: false, existingClientRelationship: 'NONE', existingTechnology: [],
        relevantOpenJobPostings: 0, transformationActivity: false, expansionActivity: false,
        mergerOrAcquisitionActivity: false, leadershipChange: false, regulatoryPressure: false,
        publiclyStatedPriority: null, recentBusinessTrigger: null, triggerVerification: 'NONE',
      },
      contact: {
        roleCategory: 'OPERATIONAL_OWNER', directProblemResponsibility: false, ownsBudget: false,
      },
    });
    expect(p3.decision.priority).toBe('P3');
  });

  it('rejects a score below the working threshold', () => {
    const result = decidePriority({
      score: { ...score(), totalScore: 20, roleRelevanceScore: 5, dataQualityScore: 3 },
      gate: runRelevanceGate({
        account: makeAccount(), contact: makeContact(), campaign: makeCampaign(),
        compliance: evaluateCompliance({
          contact: makeContact(), record: makeComplianceRecord(), rule: makeCountryRule(), now: NOW,
        }),
        now: NOW,
      }),
      compliance: evaluateCompliance({
        contact: makeContact(), record: makeComplianceRecord(), rule: makeCountryRule(), now: NOW,
      }),
      weights: DEFAULT_WEIGHTS,
      contact: makeContact(),
      account: makeAccount(),
    });
    expect(result.priority).toBe('REJECT');
    expect(result.reasons.join(' ')).toContain('below the minimum working threshold');
  });

  it('rejects a duplicate whatever it scores', () => {
    const result = qualify({ contact: { isDuplicate: true, duplicateOfId: 'ct-original' } });
    expect(result.decision.priority).toBe('REJECT');
    expect(result.decision.reasons[0]).toContain('Duplicate');
  });
});

describe('scoring is campaign-specific', () => {
  it('scores the same person differently on a campaign they do not fit', () => {
    const contact = makeContact();
    const account = makeAccount();
    const energyCampaign = makeCampaign({
      id: 'camp-energy',
      targetIndustries: ['Energy and Utilities', 'Oil and Gas'],
      targetSubIndustries: [],
      targetJobFunctions: ['FIELD_OPERATIONS', 'ASSET_MAINTENANCE'],
      relevantTitleTerms: ['asset management', 'maintenance', 'field operations'],
      excludedTitleTerms: [],
    });

    const cx = qualifyContact({
      account, contact, campaign: makeCampaign(),
      complianceRecord: makeComplianceRecord(), countryRule: makeCountryRule(), now: NOW,
    });
    const energy = qualifyContact({
      account, contact, campaign: energyCampaign,
      complianceRecord: makeComplianceRecord(), countryRule: makeCountryRule(), now: NOW,
    });

    expect(cx.decision.priority).toBe('P1');
    expect(energy.decision.priority).toBe('REJECT');
  });
});
