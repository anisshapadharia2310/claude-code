import { describe, expect, it } from 'vitest';
import { DataConfidence, DecisionRole, RoleCategory, Seniority } from '@prisma/client';
import {
  assessProblemAffinity,
  classifyRoleCategory,
  detectSeniority,
  isStrongTerm,
  normalizeJobTitle,
} from './role-taxonomy';
import { makeCampaign } from './__fixtures__';

const campaign = makeCampaign();

function classify(overrides: {
  title: string;
  department?: string | null;
  jobFunction?: string | null;
  ownsBudget?: boolean;
  influencesDecision?: boolean;
  directProblemResponsibility?: boolean;
  seniority?: Seniority;
}) {
  const normalizedJobTitle = normalizeJobTitle(overrides.title);
  return classifyRoleCategory(
    {
      normalizedJobTitle,
      department: overrides.department ?? null,
      jobFunction: overrides.jobFunction ?? null,
      seniority: overrides.seniority ?? detectSeniority(normalizedJobTitle),
      decisionRole: DecisionRole.UNKNOWN,
      ownsBudget: overrides.ownsBudget ?? false,
      influencesDecision: overrides.influencesDecision ?? false,
      directProblemResponsibility: overrides.directProblemResponsibility ?? false,
    },
    campaign,
  );
}

describe('normalizeJobTitle', () => {
  it('lower-cases, strips decoration and drops trailing self-promotion', () => {
    expect(normalizeJobTitle('Head of CX | Keynote Speaker')).toBe(
      'head of customer experience',
    );
  });

  it('expands common abbreviations', () => {
    expect(normalizeJobTitle('Sr. Dir., Cust. Ops')).toContain('senior director');
    expect(normalizeJobTitle('VP Customer Service')).toBe('vice president customer service');
    expect(normalizeJobTitle('IT Manager')).toBe('information technology manager');
  });

  it('removes parenthetical noise', () => {
    expect(normalizeJobTitle('Director (Maternity Cover) Customer Operations')).toBe(
      'director customer operations',
    );
  });
});

describe('detectSeniority', () => {
  it.each([
    ['chief customer officer', Seniority.C_LEVEL],
    ['senior vice president operations', Seniority.SVP],
    ['vice president customer experience', Seniority.VP],
    ['head of service delivery', Seniority.HEAD],
    ['director of customer operations', Seniority.DIRECTOR],
    ['customer service manager', Seniority.MANAGER],
    ['customer support analyst', Seniority.INDIVIDUAL_CONTRIBUTOR],
  ])('classifies "%s" as %s', (title, expected) => {
    expect(detectSeniority(title)).toBe(expected);
  });
});

describe('term strength', () => {
  it('treats a bare ambiguous word as weak evidence', () => {
    expect(isStrongTerm('customer')).toBe(false);
    expect(isStrongTerm('operations')).toBe(false);
  });

  it('treats a specific phrase as strong evidence', () => {
    expect(isStrongTerm('customer experience')).toBe(true);
    expect(isStrongTerm('contact centre')).toBe(true);
  });
});

describe('the "customer" keyword trap', () => {
  it('does not classify a sales account executive as an owner of customer experience', () => {
    const result = classify({
      title: 'Customer Account Executive',
      department: 'Sales',
      jobFunction: 'Sales',
    });
    expect(result.category).toBe(RoleCategory.PERIPHERAL);
    expect(result.ownershipEvidenceCount).toBeLessThan(2);
    expect(result.rejectedSignals.join(' ')).toMatch(
      /ambiguous word "customer", which is not on its own evidence/,
    );
  });

  it('does not promote a customer-facing salesperson just because they are senior', () => {
    const result = classify({
      title: 'VP Customer Accounts',
      department: 'Sales',
      jobFunction: 'Business Development',
      seniority: Seniority.VP,
    });
    expect(result.category).not.toBe(RoleCategory.DIRECT_OWNER);
    expect(result.category).not.toBe(RoleCategory.OPERATIONAL_OWNER);
  });

  it('classifies a genuine CX leader as the direct owner', () => {
    const result = classify({
      title: 'Head of Customer Experience Transformation',
      department: 'Customer Experience',
      jobFunction: 'Customer Experience',
      directProblemResponsibility: true,
    });
    expect(result.category).toBe(RoleCategory.DIRECT_OWNER);
    expect(result.confidence).toBe(DataConfidence.HIGH);
    expect(result.signals.join(' ')).toMatch(/specific phrase "customer experience"/);
  });

  it('requires corroboration: a strong title alone is an operational owner, not a direct owner', () => {
    const result = classify({
      title: 'Director of Customer Experience',
      department: null,
      jobFunction: null,
    });
    expect(result.category).not.toBe(RoleCategory.DIRECT_OWNER);
  });

  it('recognises an operational owner running the function day to day', () => {
    const result = classify({
      title: 'Contact Centre Operations Manager',
      department: 'Customer Operations',
      jobFunction: 'Customer Operations',
      seniority: Seniority.MANAGER,
    });
    expect(result.category).toBe(RoleCategory.OPERATIONAL_OWNER);
  });
});

describe('other taxonomy branches', () => {
  it('classifies procurement separately from the problem owner', () => {
    expect(classify({ title: 'Procurement Manager', department: 'Procurement' }).category).toBe(
      RoleCategory.PROCUREMENT,
    );
  });

  it('classifies a C-level with budget as an executive sponsor rather than an owner', () => {
    const result = classify({
      title: 'Chief Operating Officer',
      department: 'Executive',
      seniority: Seniority.C_LEVEL,
      ownsBudget: true,
    });
    expect(result.category).toBe(RoleCategory.EXECUTIVE_SPONSOR);
  });

  it('classifies an IT leader with influence as a technical evaluator', () => {
    const result = classify({
      title: 'IT Director',
      department: 'Information Technology',
      jobFunction: 'Information Technology',
      influencesDecision: true,
    });
    expect(result.category).toBe(RoleCategory.TECHNICAL_EVALUATOR);
  });

  it('classifies a front-line agent in the problem area as an end user', () => {
    const result = classify({
      title: 'Customer Service Advisor',
      department: 'Customer Service',
      jobFunction: 'Customer Service',
      seniority: Seniority.INDIVIDUAL_CONTRIBUTOR,
    });
    expect(result.category).toBe(RoleCategory.END_USER);
  });

  it('returns UNKNOWN with a review prompt when there is not enough evidence', () => {
    const result = classify({ title: 'Regional Lead', department: null, jobFunction: null });
    expect(result.category).toBe(RoleCategory.UNKNOWN);
    expect(result.confidence).toBe(DataConfidence.UNVERIFIED);
    expect(result.rejectedSignals.join(' ')).toMatch(/needs research review/);
  });
});

describe('assessProblemAffinity', () => {
  it('separates strong phrase evidence from weak keyword coincidence', () => {
    const affinity = assessProblemAffinity(
      {
        normalizedJobTitle: 'customer experience director',
        department: 'Customer Experience',
        jobFunction: null,
        directProblemResponsibility: false,
      },
      campaign,
    );
    expect(affinity.strongTitleMatches).toContain('customer experience');
    expect(affinity.weakTitleMatches).toContain('customer');
    expect(affinity.evidenceCount).toBe(2);
  });
});
