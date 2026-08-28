/**
 * Role taxonomy and campaign relevance.
 *
 * This module exists to defeat one specific failure: a contact whose title
 * contains a campaign keyword but who does not own the work. "Customer Account
 * Executive" contains "customer" and owns nothing about customer experience.
 *
 * Two separate questions are answered here, and they are never conflated:
 *   1. classifyRole()             - what kind of stakeholder is this person?
 *   2. assessCampaignRelevance()  - do they own THIS campaign's problem?
 */
import { SENIORITY_RANK, containsAnyTerm, listIncludes } from './normalize';
import type { DataConfidence, DecisionRole, RoleCategory, Seniority } from './types';

export const ROLE_CATEGORIES: RoleCategory[] = [
  'DIRECT_OWNER',
  'OPERATIONAL_OWNER',
  'EXECUTIVE_SPONSOR',
  'TECHNICAL_EVALUATOR',
  'BUSINESS_INFLUENCER',
  'PROCUREMENT',
  'END_USER',
  'PERIPHERAL',
  'UNKNOWN',
];

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  DIRECT_OWNER: 'Direct owner',
  OPERATIONAL_OWNER: 'Operational owner',
  EXECUTIVE_SPONSOR: 'Executive sponsor',
  TECHNICAL_EVALUATOR: 'Technical evaluator',
  BUSINESS_INFLUENCER: 'Business influencer',
  PROCUREMENT: 'Procurement',
  END_USER: 'End user',
  PERIPHERAL: 'Peripheral',
  UNKNOWN: 'Unknown',
};

export const ROLE_CATEGORY_DESCRIPTIONS: Record<RoleCategory, string> = {
  DIRECT_OWNER: 'Accountable for the outcome the campaign addresses.',
  OPERATIONAL_OWNER: 'Runs the day-to-day function the campaign addresses.',
  EXECUTIVE_SPONSOR: 'Sets direction and funds the work without running it.',
  TECHNICAL_EVALUATOR: 'Assesses systems and feasibility for the work.',
  BUSINESS_INFLUENCER: 'Shapes the decision from an adjacent function.',
  PROCUREMENT: 'Controls commercial process, not the business problem.',
  END_USER: 'Uses the outcome but does not decide or run it.',
  PERIPHERAL: 'No demonstrated connection to the campaign problem.',
  UNKNOWN: 'Not yet classified. Requires research review.',
};

export type BusinessFunction =
  | 'CUSTOMER_EXPERIENCE'
  | 'CUSTOMER_SERVICE'
  | 'CUSTOMER_SUCCESS'
  | 'CONTACT_CENTRE'
  | 'DIGITAL_TRANSFORMATION'
  | 'IT'
  | 'DATA_ANALYTICS'
  | 'OPERATIONS'
  | 'FIELD_OPERATIONS'
  | 'ASSET_MAINTENANCE'
  | 'ENGINEERING'
  | 'SALES'
  | 'MARKETING'
  | 'FINANCE'
  | 'HR'
  | 'PROCUREMENT'
  | 'LEGAL_COMPLIANCE'
  | 'GENERAL_MANAGEMENT';

export const BUSINESS_FUNCTION_LABELS: Record<BusinessFunction, string> = {
  CUSTOMER_EXPERIENCE: 'Customer experience',
  CUSTOMER_SERVICE: 'Customer service',
  CUSTOMER_SUCCESS: 'Customer success',
  CONTACT_CENTRE: 'Contact centre operations',
  DIGITAL_TRANSFORMATION: 'Digital transformation',
  IT: 'Information technology',
  DATA_ANALYTICS: 'Data and analytics',
  OPERATIONS: 'Business operations',
  FIELD_OPERATIONS: 'Field and network operations',
  ASSET_MAINTENANCE: 'Asset and maintenance management',
  ENGINEERING: 'Engineering',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  FINANCE: 'Finance',
  HR: 'Human resources',
  PROCUREMENT: 'Procurement',
  LEGAL_COMPLIANCE: 'Legal and compliance',
  GENERAL_MANAGEMENT: 'General management',
};

interface FunctionRule {
  fn: BusinessFunction;
  /** Any of these must appear in the normalized title or department. */
  include: RegExp[];
  /**
   * When present, at least one must also appear. This is what stops a bare
   * keyword from qualifying: "customer" alone is never enough.
   */
  requireAlso?: RegExp[];
  /** Any match here disqualifies the function outright. */
  exclude?: RegExp[];
}

/**
 * Ownership nouns. A "customer" title only becomes a customer-function title
 * when paired with one of these - the word describes work that is owned, not a
 * market that is sold to.
 */
const CUSTOMER_OWNERSHIP_NOUNS = [
  /\bexperience\b/, /\bservice\b/, /\bservices\b/, /\bcare\b/, /\bsupport\b/,
  /\bexperiencia\b/, /\bservicio\b/, /\batenci[oó]n\b/, /\brelation\b/, /\brelaciones\b/,
  /\boperations\b/, /\bsuccess\b/, /\bjourney\b/, /\bsatisfaction\b/,
  /\bcontact cent(er|re)\b/, /\bcall cent(er|re)\b/, /\bservice desk\b/,
  /\bengagement\b/, /\btransformation\b/, /\bquality\b/, /\badvocacy\b/,
];

/**
 * Titles that contain a customer keyword but describe revenue generation.
 * These are the false positives the agency currently calls by mistake.
 */
const CUSTOMER_DECOYS = [
  /\baccount executive\b/, /\baccount manager\b/, /\bkey accounts?\b/, /\bventas\b/,
  /\bsales\b/, /\bbusiness development\b/, /\bacquisition\b/,
  /\bnew business\b/, /\bpartnerships?\b/, /\bchannel\b/,
  /\brevenue\b/, /\bgrowth marketing\b/, /\bdemand generation\b/,
  /\bcustomer marketing\b/, /\bmarket research\b/, /\bcustomer insights?\b/,
  /\brelationship manager\b/, /\bcustomer sales\b/, /\bretail\b/,
];

const FUNCTION_RULES: FunctionRule[] = [
  {
    fn: 'CUSTOMER_EXPERIENCE',
    include: [
      /\bcustomer experience\b/, /\bclient experience\b/, /\bcx\b/, /\bcustomer journey\b/,
      /\bexperience design\b/, /\bcustomer advocacy\b/, /\bvoice of the customer\b/,
      // A chief customer or experience officer owns the outcome by definition.
      /\bchief customer officer\b/, /\bchief experience officer\b/, /\bchief customer experience officer\b/,
      // Spanish, French and Portuguese equivalents.
      /\bexperiencia del cliente\b/, /\bexperiencia de cliente\b/, /\bexperi[eê]ncia do cliente\b/,
      /\bexp[eé]rience client\b/, /\brelation client\b/, /\brelations? clients?\b/,
    ],
    exclude: [/\baccount executive\b/, /\bsales\b/, /\bacquisition\b/, /\bcustomer marketing\b/, /\bmarket research\b/],
  },
  {
    fn: 'CUSTOMER_SERVICE',
    include: [
      /\bcustomer service\b/, /\bcustomer care\b/, /\bcustomer support\b/, /\bclient services?\b/,
      /\bservice delivery\b/, /\bservice operations\b/, /\bafter sales service\b/,
      /\bguest services?\b/, /\bguest experience\b/, /\bpatient access\b/, /\bservice quality\b/,
      /\bservice client\b/, /\bservicio al cliente\b/, /\bservicio de atenci[oó]n\b/,
      /\batenci[oó]n al cliente\b/, /\bsoporte al cliente\b/,
    ],
    exclude: [/\bsales\b(?! service)/, /\baccount executive\b/, /\bfinancial services\b/, /\bprofessional services sales\b/],
  },
  {
    fn: 'CUSTOMER_SUCCESS',
    include: [/\bcustomer success\b/, /\bclient success\b/, /\bcustomer retention\b/, /\bchurn\b/],
    exclude: [/\bsales\b/, /\baccount executive\b/],
  },
  {
    fn: 'CONTACT_CENTRE',
    include: [
      /\bcontact cent(er|re)\b/, /\bcall cent(er|re)\b/, /\bservice desk\b/, /\bhelp ?desk\b/,
      /\bcustomer contact\b/, /\bomnichannel\b/, /\bcentro de contacto\b/, /\bcentre de contact\b/,
    ],
  },
  {
    fn: 'DIGITAL_TRANSFORMATION',
    include: [/\bdigital transformation\b/, /\btransformation\b/, /\btransformaci[oó]n\b/, /\bchange and transformation\b/, /\bbusiness transformation\b/, /\bdigital\b/, /\binnovation\b/, /\bmodernization\b/, /\bmodernisation\b/, /\bautomation\b/, /\bprocess excellence\b/, /\bcontinuous improvement\b/],
    exclude: [/\bdigital marketing\b/, /\bdigital sales\b/, /\bdigital content\b/, /\bdigital advertising\b/],
  },
  {
    fn: 'IT',
    include: [/\binformation technology\b/, /\bchief information officer\b/, /\bchief technology officer\b/, /\bsolution architect\b/, /\benterprise architect\b/, /\bapplications?\b/, /\binfrastructure\b/, /\bsystems\b/, /\bplatform\b/, /\bchief information security officer\b/, /\bcyber\b/],
  },
  {
    fn: 'DATA_ANALYTICS',
    include: [/\bdata\b/, /\banalytics\b/, /\bbusiness intelligence\b/, /\bchief digital officer\b/, /\binsights? and analytics\b/, /\bmachine learning\b/, /\bartificial intelligence\b/],
    exclude: [/\bdata entry\b/, /\bmarket research\b/],
  },
  {
    fn: 'OPERATIONS',
    include: [
      /\boperations\b/, /\bchief operating officer\b/, /\bprocess\b/, /\bservice management\b/,
      /\bshared services\b/, /\bbusiness process outsourcing\b/, /\boperaciones\b/, /\bexploitation\b/,
    ],
    exclude: [/\bsales operations\b/, /\bmarketing operations\b/, /\brevenue operations\b/, /\bpeople operations\b/],
  },
  {
    fn: 'FIELD_OPERATIONS',
    include: [
      /\bfield operations\b/, /\bnetwork operations\b/, /\bgrid\b/, /\bdistribution\b/,
      /\btransmission\b/, /\bplant\b/, /\bpipeline\b/, /\bupstream\b/, /\bdownstream\b/,
      /\brefinery\b/, /\bterminal\b/, /\bsubstation\b/, /\bmetering\b/,
      /\bsupervisory control and data acquisition\b/, /\boperaciones de campo\b/, /\br[eé]seau\b/,
      /\breseau\b/, /\brolling stock\b/, /\bsignalling\b/, /\bsignaling\b/,
    ],
  },
  {
    fn: 'ASSET_MAINTENANCE',
    include: [
      /\basset management\b/, /\bmaintenance\b/, /\breliability\b/, /\boperations and maintenance\b/,
      /\bintegrity\b/, /\bturnaround\b/, /\basset performance\b/, /\basset data\b/,
      /\bmantenimiento\b/, /\bfiabilidad\b/,
    ],
    exclude: [/\bwealth\b/, /\binvestment\b/, /\bfund\b/, /\bportfolio management\b/],
  },
  {
    fn: 'ENGINEERING',
    include: [/\bengineering\b/, /\bengineer\b/, /\btechnical\b/, /\bproject management office\b/, /\bcommissioning\b/],
  },
  {
    fn: 'SALES',
    include: [
      /\bsales\b/, /\baccount executive\b/, /\bbusiness development\b/, /\bkey accounts?\b/,
      /\brevenue\b/, /\bcommercial\b/, /\bchannel\b/, /\bventas\b/,
    ],
    exclude: [/\bsales support systems\b/],
  },
  {
    fn: 'MARKETING',
    include: [/\bmarketing\b/, /\bbrand\b/, /\bcommunications?\b/, /\bdemand generation\b/, /\bcampaigns?\b/, /\bcontent\b/, /\bpublic relations\b/],
  },
  {
    fn: 'FINANCE',
    include: [/\bfinance\b/, /\bfinancial\b/, /\bchief financial officer\b/, /\baccounting\b/, /\bcontroller\b/, /\btreasury\b/, /\baudit\b/],
  },
  {
    fn: 'HR',
    include: [/\bhuman resources\b/, /\bpeople\b/, /\btalent\b/, /\brecruit\w*\b/, /\blearning and development\b/, /\bchief human resources officer\b/],
  },
  {
    fn: 'PROCUREMENT',
    include: [/\bprocurement\b/, /\bpurchasing\b/, /\bsourcing\b/, /\bvendor management\b/, /\bsupplier\b/, /\bcontracts?\b/],
  },
  {
    fn: 'LEGAL_COMPLIANCE',
    include: [/\blegal\b/, /\bcompliance\b/, /\bregulatory\b/, /\bcounsel\b/, /\bprivacy\b/, /\brisk\b/, /\bgovernance\b/],
  },
  {
    fn: 'GENERAL_MANAGEMENT',
    include: [/\bchief executive officer\b/, /\bmanaging director\b/, /\bgeneral manager\b/, /\bcountry manager\b/, /\bpresident\b/, /\bowner\b/, /\bpartner\b/],
  },
];

/** A function that was detected, with the phrase that produced it. */
export interface FunctionMatch {
  fn: BusinessFunction;
  evidence: string;
}

const CUSTOMER_KEYWORDS = [/\bcustomer\b/, /\bclient\b/, /\bclients\b/, /\bcliente\b/, /\bclientes\b/, /\bconsumer\b/];

function firstMatch(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) return found[0];
  }
  return null;
}

/**
 * Detect the business functions a title belongs to.
 *
 * A customer keyword without an ownership noun, or with a revenue-side decoy,
 * is explicitly rejected and reported so the reason is visible to a reviewer.
 */
export function detectFunctions(
  normalizedTitle: string,
  department?: string | null,
): { matches: FunctionMatch[]; rejected: string[] } {
  const text = `${normalizedTitle} ${(department ?? '').toLowerCase()}`.trim();
  const matches: FunctionMatch[] = [];
  const rejected: string[] = [];

  if (!text) return { matches, rejected };

  const customerKeyword = firstMatch(CUSTOMER_KEYWORDS, text);
  const ownershipNoun = firstMatch(CUSTOMER_OWNERSHIP_NOUNS, text);
  const decoy = firstMatch(CUSTOMER_DECOYS, text);

  for (const rule of FUNCTION_RULES) {
    const hit = firstMatch(rule.include, text);
    if (!hit) continue;
    if (rule.exclude && firstMatch(rule.exclude, text)) {
      rejected.push(
        `"${hit}" suggested ${BUSINESS_FUNCTION_LABELS[rule.fn]}, but "${firstMatch(rule.exclude, text)}" rules it out.`,
      );
      continue;
    }
    if (rule.requireAlso && !firstMatch(rule.requireAlso, text)) continue;
    matches.push({ fn: rule.fn, evidence: hit });
  }

  const customerFunctions: BusinessFunction[] = [
    'CUSTOMER_EXPERIENCE', 'CUSTOMER_SERVICE', 'CUSTOMER_SUCCESS', 'CONTACT_CENTRE',
  ];
  const hasCustomerFunction = matches.some((m) => customerFunctions.includes(m.fn));

  if (customerKeyword && !hasCustomerFunction) {
    if (decoy) {
      rejected.push(
        `Title contains "${customerKeyword}" but describes "${decoy}", which is a revenue role, not ownership of customer operations.`,
      );
    } else if (!ownershipNoun) {
      rejected.push(
        `Title contains "${customerKeyword}" with no ownership noun (experience, service, care, support, operations, success). A keyword alone does not qualify.`,
      );
    }
  }

  return { matches, rejected };
}

export interface RoleClassificationInput {
  normalizedJobTitle: string;
  department?: string | null;
  seniority: Seniority;
  ownsBudget?: boolean;
  influencesDecision?: boolean;
  directProblemResponsibility?: boolean;
  decisionRole?: DecisionRole;
}

export interface RoleClassification {
  roleCategory: RoleCategory;
  confidence: DataConfidence;
  functions: BusinessFunction[];
  matchedSignals: string[];
  rejectedSignals: string[];
  explanation: string;
}

const CORE_DELIVERY_FUNCTIONS: BusinessFunction[] = [
  'CUSTOMER_EXPERIENCE', 'CUSTOMER_SERVICE', 'CUSTOMER_SUCCESS', 'CONTACT_CENTRE',
  'DIGITAL_TRANSFORMATION', 'OPERATIONS', 'FIELD_OPERATIONS', 'ASSET_MAINTENANCE',
];

const TECHNICAL_FUNCTIONS: BusinessFunction[] = ['IT', 'DATA_ANALYTICS', 'ENGINEERING'];
const ADJACENT_FUNCTIONS: BusinessFunction[] = ['SALES', 'MARKETING', 'FINANCE', 'HR', 'LEGAL_COMPLIANCE'];

/**
 * Campaign-independent classification, used at import time to produce a
 * starting point. Anything below HIGH confidence is routed to research review
 * rather than trusted.
 */
export function classifyRole(input: RoleClassificationInput): RoleClassification {
  const { matches, rejected } = detectFunctions(input.normalizedJobTitle, input.department);
  const functions = matches.map((m) => m.fn);
  const signals = matches.map((m) => `"${m.evidence}" -> ${BUSINESS_FUNCTION_LABELS[m.fn]}`);
  const rank = SENIORITY_RANK[input.seniority];

  if (functions.length === 0) {
    return {
      roleCategory: 'UNKNOWN',
      confidence: 'UNKNOWN',
      functions,
      matchedSignals: signals,
      rejectedSignals: rejected,
      explanation: rejected.length > 0
        ? `No business function could be established. ${rejected[0]}`
        : 'No recognised business function in the title or department. Needs research review.',
    };
  }

  const hasCore = functions.some((fn) => CORE_DELIVERY_FUNCTIONS.includes(fn));
  const hasTechnical = functions.some((fn) => TECHNICAL_FUNCTIONS.includes(fn));
  const isProcurement = functions.includes('PROCUREMENT');
  const isAdjacentOnly = !hasCore && !hasTechnical && !isProcurement
    && functions.some((fn) => ADJACENT_FUNCTIONS.includes(fn));

  let roleCategory: RoleCategory;
  let confidence: DataConfidence = 'MEDIUM';
  let explanation: string;

  if (isProcurement) {
    roleCategory = 'PROCUREMENT';
    confidence = 'HIGH';
    explanation = 'Procurement function: controls commercial process, not the business problem.';
  } else if (hasCore && rank >= SENIORITY_RANK.DIRECTOR) {
    // Senior enough to be accountable for the function they sit in.
    roleCategory = input.directProblemResponsibility ? 'DIRECT_OWNER' : 'OPERATIONAL_OWNER';
    confidence = input.directProblemResponsibility ? 'HIGH' : 'MEDIUM';
    explanation = input.directProblemResponsibility
      ? 'Senior leader in the owning function with confirmed problem responsibility.'
      : 'Senior leader in the owning function. Direct responsibility not yet confirmed by research.';
  } else if (hasCore && rank >= SENIORITY_RANK.TEAM_LEAD) {
    roleCategory = 'OPERATIONAL_OWNER';
    confidence = 'MEDIUM';
    explanation = 'Runs day-to-day work inside the owning function.';
  } else if (hasCore) {
    roleCategory = 'END_USER';
    confidence = 'MEDIUM';
    explanation = 'Works inside the owning function but has no leadership scope.';
  } else if (functions.includes('GENERAL_MANAGEMENT') && rank >= SENIORITY_RANK.VP) {
    roleCategory = 'EXECUTIVE_SPONSOR';
    confidence = 'MEDIUM';
    explanation = 'General management at executive level: sets direction and funds work.';
  } else if (hasTechnical) {
    roleCategory = rank >= SENIORITY_RANK.VP ? 'EXECUTIVE_SPONSOR' : 'TECHNICAL_EVALUATOR';
    confidence = 'MEDIUM';
    explanation = rank >= SENIORITY_RANK.VP
      ? 'Technology executive: sponsors and funds systems decisions.'
      : 'Technical function: evaluates feasibility rather than owning the outcome.';
  } else if (isAdjacentOnly) {
    roleCategory = rank >= SENIORITY_RANK.DIRECTOR ? 'BUSINESS_INFLUENCER' : 'PERIPHERAL';
    confidence = 'MEDIUM';
    explanation = rank >= SENIORITY_RANK.DIRECTOR
      ? 'Adjacent function with enough seniority to influence the decision.'
      : 'Adjacent function with no demonstrated influence on the problem.';
  } else {
    roleCategory = 'PERIPHERAL';
    confidence = 'LOW';
    explanation = 'No connection to the campaign problem could be established from the title.';
  }

  // Seniority alone must never carry a classification.
  if (roleCategory === 'DIRECT_OWNER' && functions.length === 0) {
    roleCategory = 'UNKNOWN';
    confidence = 'LOW';
    explanation = 'Seniority is high but no owning function was identified. Seniority alone does not qualify.';
  }

  return { roleCategory, confidence, functions, matchedSignals: signals, rejectedSignals: rejected, explanation };
}

/** The campaign fields relevance is assessed against. */
export interface CampaignRelevanceCriteria {
  targetJobFunctions: string[];
  targetRoleCategories: RoleCategory[];
  targetSeniorities: Seniority[];
  relevantTitleTerms: string[];
  excludedTitleTerms: string[];
  relevantDepartments: string[];
}

export interface CampaignRelevanceResult {
  /** True when the contact has a demonstrable connection to the problem. */
  relevant: boolean;
  /** Accountable for the outcome. Worth 12 points in band B. */
  directOwnership: boolean;
  /** Runs or strongly influences the work. Worth 8 points in band B. */
  operationalOwnership: boolean;
  /** Seniority is in the campaign's target range. */
  seniorityRelevant: boolean;
  matchedFunctions: BusinessFunction[];
  matchedTerms: string[];
  excludedBy: string | null;
  /**
   * True when the title looked relevant on a keyword but failed the ownership
   * test. Surfaced in the UI as the reason the contact was not promoted.
   */
  keywordTrap: boolean;
  rejectedSignals: string[];
  explanation: string;
}

const OWNERSHIP_ROLE_CATEGORIES: RoleCategory[] = [
  'DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'BUSINESS_INFLUENCER',
];

/**
 * Decide whether a contact is relevant to a specific campaign.
 *
 * Requires agreement between the normalized title, the department, the
 * classified role category and the researcher-recorded responsibility flags.
 * No single one of those is sufficient.
 */
export function assessCampaignRelevance(
  contact: {
    normalizedJobTitle: string;
    department?: string | null;
    roleCategory: RoleCategory;
    seniority: Seniority;
    ownsBudget: boolean;
    influencesDecision: boolean;
    directProblemResponsibility: boolean;
  },
  criteria: CampaignRelevanceCriteria,
): CampaignRelevanceResult {
  const { matches, rejected } = detectFunctions(contact.normalizedJobTitle, contact.department);
  const searchText = `${contact.normalizedJobTitle} ${(contact.department ?? '').toLowerCase()}`;

  const excludedBy = containsAnyTerm(searchText, criteria.excludedTitleTerms);
  const matchedFunctions = matches
    .map((m) => m.fn)
    .filter((fn) => criteria.targetJobFunctions.length === 0 || criteria.targetJobFunctions.includes(fn));

  const matchedTerms: string[] = [];
  const titleTerm = containsAnyTerm(searchText, criteria.relevantTitleTerms);
  if (titleTerm) matchedTerms.push(titleTerm);
  const departmentTerm = contact.department
    ? containsAnyTerm(contact.department.toLowerCase(), criteria.relevantDepartments)
    : null;
  if (departmentTerm) matchedTerms.push(departmentTerm);

  const categoryRelevant = criteria.targetRoleCategories.length === 0
    ? OWNERSHIP_ROLE_CATEGORIES.includes(contact.roleCategory)
    : criteria.targetRoleCategories.includes(contact.roleCategory);

  const seniorityRelevant = criteria.targetSeniorities.length === 0
    ? SENIORITY_RANK[contact.seniority] >= SENIORITY_RANK.MANAGER
    : criteria.targetSeniorities.includes(contact.seniority);

  // A function match OR an explicit campaign title/department term is required.
  const functionalMatch = matchedFunctions.length > 0 || matchedTerms.length > 0;

  if (excludedBy) {
    return {
      relevant: false,
      directOwnership: false,
      operationalOwnership: false,
      seniorityRelevant,
      matchedFunctions,
      matchedTerms,
      excludedBy,
      keywordTrap: matchedTerms.length > 0,
      rejectedSignals: rejected,
      explanation: `Excluded by campaign rule: the title or department contains "${excludedBy}".`,
    };
  }

  if (!functionalMatch) {
    const keywordTrap = rejected.length > 0;
    return {
      relevant: false,
      directOwnership: false,
      operationalOwnership: false,
      seniorityRelevant,
      matchedFunctions,
      matchedTerms,
      excludedBy: null,
      keywordTrap,
      rejectedSignals: rejected,
      explanation: keywordTrap
        ? `Not relevant. ${rejected[0]}`
        : 'Not relevant: no target job function, title term or department matched.',
    };
  }

  const relevant = functionalMatch && categoryRelevant;

  // Band B, 12 points. Requires all three to agree: the classified category
  // says owner, the researcher recorded direct responsibility, and the function
  // actually matches the campaign.
  const directOwnership =
    contact.roleCategory === 'DIRECT_OWNER'
    && contact.directProblemResponsibility
    && functionalMatch;

  // Band B, 8 points. Runs the work day-to-day or demonstrably shapes it.
  const operationalOwnership =
    relevant
    && OWNERSHIP_ROLE_CATEGORIES.includes(contact.roleCategory)
    && (contact.directProblemResponsibility || contact.influencesDecision || contact.ownsBudget
      || contact.roleCategory === 'OPERATIONAL_OWNER');

  const parts: string[] = [];
  if (matchedFunctions.length > 0) {
    parts.push(`function ${matchedFunctions.map((fn) => BUSINESS_FUNCTION_LABELS[fn]).join(', ')}`);
  }
  if (matchedTerms.length > 0) parts.push(`campaign term "${matchedTerms.join('", "')}"`);
  parts.push(`role category ${ROLE_CATEGORY_LABELS[contact.roleCategory]}`);
  if (contact.directProblemResponsibility) parts.push('confirmed direct responsibility');
  else parts.push('no confirmed direct responsibility');

  return {
    relevant,
    directOwnership,
    operationalOwnership,
    seniorityRelevant,
    matchedFunctions,
    matchedTerms,
    excludedBy: null,
    keywordTrap: false,
    rejectedSignals: rejected,
    explanation: relevant
      ? `Relevant on ${parts.join('; ')}.`
      : `Function matched but role category ${ROLE_CATEGORY_LABELS[contact.roleCategory]} is not a target category for this campaign.`,
  };
}

/** Convenience wrapper used by targeting filters in the UI. */
export function isTargetRoleCategory(
  roleCategory: RoleCategory,
  targets: RoleCategory[],
): boolean {
  return targets.length === 0 || targets.includes(roleCategory);
}
