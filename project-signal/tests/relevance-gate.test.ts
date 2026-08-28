/**
 * The mandatory relevance gate.
 *
 * Each of the checks is exercised in isolation, plus the tiering rule: a
 * blocking failure rejects the contact outright, a review failure leaves the
 * contact workable but locks P1 until a person resolves it.
 */
import { describe, expect, it } from 'vitest';
import { evaluateCompliance } from '@/domain/compliance';
import { runRelevanceGate, STALE_REJECT_DAYS, STALE_REVIEW_DAYS } from '@/domain/relevance-gate';
import { assessCampaignRelevance, classifyRole, detectFunctions } from '@/domain/taxonomy';
import { inferSeniority, normalizeJobTitle } from '@/domain/normalize';
import {
  daysAgo, makeAccount, makeCampaign, makeComplianceRecord, makeContact, makeCountryRule, NOW,
} from './factories';

function gate(options: {
  account?: Parameters<typeof makeAccount>[0];
  contact?: Parameters<typeof makeContact>[0];
  campaign?: Parameters<typeof makeCampaign>[0];
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
  return runRelevanceGate({ account, contact, campaign, compliance, now: NOW });
}

const check = (result: ReturnType<typeof gate>, code: string) =>
  result.checks.find((entry) => entry.code === code)!;

describe('the gate passes a well-evidenced contact', () => {
  it('passes every check and allows P1', () => {
    const result = gate();
    expect(result.passed).toBe(true);
    expect(result.allowsP1).toBe(true);
    expect(result.blockingFailures).toHaveLength(0);
    expect(result.reviewFailures).toHaveLength(0);
  });

  it('reports all eight required checks', () => {
    const codes = gate().checks.map((entry) => entry.code);
    for (const code of [
      'TARGET_INDUSTRY', 'TARGET_GEOGRAPHY', 'ROLE_RELATED', 'OWNS_OR_INFLUENCES',
      'DATA_NOT_OUTDATED', 'COMMUNICATION_PERMISSION', 'NOT_OPTED_OUT', 'NOT_DUPLICATE',
    ]) {
      expect(codes).toContain(code);
    }
  });
});

describe('check 1 - target industry', () => {
  it('blocks a company outside the target industries', () => {
    const result = gate({ account: { industry: 'Real Estate', subIndustry: null } });
    expect(check(result, 'TARGET_INDUSTRY').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('passes when the campaign does not restrict industry', () => {
    const result = gate({
      account: { industry: 'Real Estate', subIndustry: null },
      campaign: { targetIndustries: [], targetSubIndustries: [] },
    });
    expect(check(result, 'TARGET_INDUSTRY').passed).toBe(true);
  });
});

describe('check 2 - target geography', () => {
  it('blocks a company outside the target countries', () => {
    const result = gate({
      account: { country: 'United States' },
      contact: { country: 'United States' },
    });
    expect(check(result, 'TARGET_GEOGRAPHY').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('treats a city outside the priority list as advisory only', () => {
    const result = gate({
      account: { city: 'Halifax' },
      campaign: { targetCities: ['Toronto', 'Montreal'] },
    });
    expect(check(result, 'TARGET_CITY').passed).toBe(false);
    expect(result.passed).toBe(true);
  });
});

describe('check 3 - the role must relate to the campaign problem', () => {
  it('blocks a title that only contains the campaign keyword', () => {
    const result = gate({
      contact: {
        jobTitle: 'Customer Account Executive',
        normalizedJobTitle: 'customer account executive',
        department: 'Sales',
        roleCategory: 'PERIPHERAL',
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
      },
    });
    expect(check(result, 'ROLE_RELATED').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('blocks a title matched by an excluded campaign term', () => {
    const result = gate({
      contact: {
        jobTitle: 'Customer Experience Sales Director',
        normalizedJobTitle: 'customer experience sales director',
        department: 'Sales',
      },
    });
    expect(check(result, 'ROLE_RELATED').passed).toBe(false);
    expect(result.relevance.excludedBy).toBe('sales');
  });

  it('blocks a role category the campaign does not target', () => {
    const result = gate({
      contact: {
        jobTitle: 'Procurement Category Manager, Customer Systems',
        normalizedJobTitle: 'procurement category manager customer systems',
        department: 'Procurement',
        roleCategory: 'PROCUREMENT',
      },
    });
    expect(check(result, 'ROLE_RELATED').passed).toBe(false);
  });
});

describe('check 4 - the contact must own or influence the problem', () => {
  it('blocks a relevant title with no ownership, budget or influence', () => {
    const result = gate({
      contact: {
        jobTitle: 'Customer Experience Coordinator',
        normalizedJobTitle: 'customer experience coordinator',
        seniority: 'INDIVIDUAL',
        roleCategory: 'END_USER',
        directProblemResponsibility: false,
        ownsBudget: false,
        influencesDecision: false,
      },
    });
    expect(check(result, 'OWNS_OR_INFLUENCES').passed).toBe(false);
    expect(result.passed).toBe(false);
  });
});

describe('check 5 - data currency', () => {
  it('rejects a record older than the outdated threshold', () => {
    const result = gate({ contact: { lastVerifiedAt: daysAgo(STALE_REJECT_DAYS + 30) } });
    expect(check(result, 'DATA_NOT_OUTDATED').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('rejects a never-verified record with no usable email or phone', () => {
    const result = gate({
      contact: {
        lastVerifiedAt: null,
        emailStatus: 'MISSING', workEmail: null,
        phoneStatus: 'MISSING', phoneNumber: null,
      },
      record: { allowedChannels: [] },
    });
    expect(check(result, 'DATA_NOT_OUTDATED').passed).toBe(false);
  });

  it('keeps a merely stale record workable but locks P1', () => {
    const result = gate({ contact: { lastVerifiedAt: daysAgo(STALE_REVIEW_DAYS + 30) } });
    expect(result.passed).toBe(true);
    expect(result.allowsP1).toBe(false);
    expect(check(result, 'DATA_CURRENT').passed).toBe(false);
    expect(check(result, 'DATA_CURRENT').severity).toBe('REVIEW');
  });
});

describe('checks 6 and 7 - permission and opt-out', () => {
  it('blocks when no channel is permitted', () => {
    const result = gate({
      contact: { consentStatus: 'OPT_OUT', workEmail: null, emailStatus: 'MISSING', phoneNumber: null, phoneStatus: 'MISSING' },
      record: { consentStatus: 'OPT_OUT', optOutStatus: 'GLOBAL_OPT_OUT' },
    });
    expect(check(result, 'COMMUNICATION_PERMISSION').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('blocks an opted-out contact', () => {
    const result = gate({
      contact: { consentStatus: 'OPT_OUT' },
      record: { consentStatus: 'OPT_OUT', optOutStatus: 'EMAIL_OPT_OUT' },
    });
    expect(check(result, 'NOT_OPTED_OUT').passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('treats an incomplete compliance record as a review-level failure', () => {
    const result = gate({ record: { lawfulBasis: 'NOT_DETERMINED' } });
    expect(check(result, 'COMPLIANCE_COMPLETE').passed).toBe(false);
    expect(result.allowsP1).toBe(false);
  });
});

describe('check 8 - duplicates', () => {
  it('blocks a record flagged as a duplicate', () => {
    const result = gate({ contact: { isDuplicate: true, duplicateOfId: 'ct-original' } });
    expect(check(result, 'NOT_DUPLICATE').passed).toBe(false);
    expect(result.passed).toBe(false);
  });
});

describe('role confidence', () => {
  it('locks P1 while role confidence is low, without rejecting the contact', () => {
    const result = gate({ contact: { roleConfidence: 'LOW' } });
    expect(result.passed).toBe(true);
    expect(result.allowsP1).toBe(false);
    expect(check(result, 'ROLE_CONFIDENCE').severity).toBe('REVIEW');
  });
});

describe('title classification, the keyword trap', () => {
  const trapTitles = [
    'Customer Account Executive',
    'Key Account Manager, Customer Solutions',
    'Customer Acquisition Marketing Manager',
    'Customer Insights Analyst',
    'Customer Success Sales Lead',
  ];

  for (const title of trapTitles) {
    it(`rejects "${title}" as a customer-function owner`, () => {
      const normalized = normalizeJobTitle(title);
      const { matches } = detectFunctions(normalized, null);
      const customerFunctions = matches.filter((match) =>
        ['CUSTOMER_EXPERIENCE', 'CUSTOMER_SERVICE', 'CONTACT_CENTRE'].includes(match.fn));
      expect(customerFunctions).toHaveLength(0);
    });
  }

  const realOwners = [
    'Director of Customer Experience',
    'VP Customer Operations',
    'Head of Contact Centre Operations',
    'Chief Customer Officer',
    'Responsable Service Client',
  ];

  for (const title of realOwners) {
    it(`recognises "${title}" as a customer-function role`, () => {
      const normalized = normalizeJobTitle(title);
      const { matches } = detectFunctions(normalized, null);
      expect(matches.length).toBeGreaterThan(0);
    });
  }

  it('explains why a keyword title was rejected', () => {
    const { rejected } = detectFunctions(normalizeJobTitle('Customer Account Executive'), 'Sales');
    expect(rejected.join(' ')).toContain('revenue role');
  });

  it('does not classify a senior title with no owning function as an owner', () => {
    const classification = classifyRole({
      normalizedJobTitle: normalizeJobTitle('Chief Financial Officer'),
      department: 'Finance',
      seniority: 'C_LEVEL',
      directProblemResponsibility: true,
    });
    expect(classification.roleCategory).not.toBe('DIRECT_OWNER');
    expect(classification.roleCategory).not.toBe('OPERATIONAL_OWNER');
  });

  it('needs agreement between the category and the recorded responsibility for direct ownership', () => {
    const criteria = {
      targetJobFunctions: ['CUSTOMER_EXPERIENCE'],
      targetRoleCategories: ['DIRECT_OWNER' as const, 'OPERATIONAL_OWNER' as const],
      targetSeniorities: [],
      relevantTitleTerms: ['customer experience'],
      excludedTitleTerms: [],
      relevantDepartments: [],
    };
    const base = {
      normalizedJobTitle: 'director customer experience',
      department: 'Customer Experience',
      seniority: 'DIRECTOR' as const,
      ownsBudget: true,
      influencesDecision: true,
    };

    const unconfirmed = assessCampaignRelevance(
      { ...base, roleCategory: 'DIRECT_OWNER', directProblemResponsibility: false }, criteria,
    );
    expect(unconfirmed.directOwnership).toBe(false);
    expect(unconfirmed.operationalOwnership).toBe(true);

    const confirmed = assessCampaignRelevance(
      { ...base, roleCategory: 'DIRECT_OWNER', directProblemResponsibility: true }, criteria,
    );
    expect(confirmed.directOwnership).toBe(true);
  });
});

describe('title normalization', () => {
  it('expands abbreviations and strips region noise', () => {
    expect(normalizeJobTitle('Sr. Dir., Cust. Experience (EMEA)')).toBe('senior director customer experience');
    expect(normalizeJobTitle('VP Ops')).toBe('vice president operations');
    expect(normalizeJobTitle('Head of CX - Retail Banking')).toBe('head of customer experience');
  });

  it('infers seniority from the normalized title', () => {
    expect(inferSeniority(normalizeJobTitle('Chief Customer Officer'))).toBe('C_LEVEL');
    expect(inferSeniority(normalizeJobTitle('SVP Customer Operations'))).toBe('SVP');
    expect(inferSeniority(normalizeJobTitle('Customer Service Team Leader'))).toBe('TEAM_LEAD');
    expect(inferSeniority(normalizeJobTitle('Customer Service Advisor'))).toBe('INDIVIDUAL');
  });
});
