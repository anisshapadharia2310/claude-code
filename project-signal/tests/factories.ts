/**
 * Test factories.
 *
 * Every factory returns a complete, valid record so a test can override the one
 * field it cares about and nothing else. The defaults describe a strong,
 * well-evidenced contact at a well-fitting account: tests then break exactly one
 * thing and assert the consequence.
 */
import type {
  Account, Campaign, ComplianceRecord, Contact, CountryComplianceRule, EngagementEvent, EventType,
} from '@prisma/client';

const DAY = 86_400_000;
export const NOW = new Date('2026-06-01T09:00:00.000Z');
export const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY);
export const daysAhead = (days: number): Date => new Date(NOW.getTime() + days * DAY);
/** A future instant at a given UTC hour, so local-time assertions are stable. */
export const daysAheadAt = (days: number, utcHour: number): Date => {
  const date = new Date(NOW.getTime() + days * DAY);
  date.setUTCHours(utcHour, 0, 0, 0);
  return date;
};

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-test',
    companyName: 'Meridian Trust Bank',
    domain: 'meridiantrust.ca',
    industry: 'Banking',
    subIndustry: 'Retail Banking',
    country: 'Canada',
    city: 'Toronto',
    region: 'North America',
    timeZone: 'America/Toronto',
    language: 'English',
    employeeBand: 'BAND_5001_10000',
    revenueBand: 'USD_1B_5B',
    numberOfLocations: 240,
    existingTechnology: ['Salesforce Service Cloud'],
    competitorTechnology: [],
    namedAccountStatus: true,
    existingClientRelationship: 'PAST_CLIENT',
    recentBusinessTrigger: 'Core banking migration entered its customer-facing phase.',
    relevantOpenJobPostings: 6,
    transformationActivity: true,
    expansionActivity: true,
    mergerOrAcquisitionActivity: false,
    leadershipChange: true,
    regulatoryPressure: true,
    publiclyStatedPriority: 'Reduce customer effort across digital and branch channels',
    triggerSourceUrl: 'https://example.com/source',
    triggerDate: daysAgo(30),
    triggerVerification: 'VERIFIED',
    accountNotes: null,
    accountDataConfidence: 'HIGH',
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'ct-test',
    accountId: 'acc-test',
    firstName: 'Elena',
    lastName: 'Marchetti',
    jobTitle: 'VP, Customer Experience Transformation',
    normalizedJobTitle: 'vice president customer experience transformation',
    department: 'Customer Experience',
    roleCategory: 'DIRECT_OWNER',
    seniority: 'VP',
    decisionRole: 'DECISION_MAKER',
    ownsBudget: true,
    influencesDecision: true,
    directProblemResponsibility: true,
    roleRelevanceNotes: null,
    roleConfidence: 'HIGH',
    tenureMonths: 28,
    country: 'Canada',
    city: 'Toronto',
    timeZone: 'America/Toronto',
    language: 'English',
    workEmail: 'elena.marchetti@meridiantrust.ca',
    emailStatus: 'VERIFIED',
    emailConfidence: 96,
    phoneNumber: '+14165550100',
    phoneStatus: 'VERIFIED',
    whatsappStatus: 'AVAILABLE_NO_CONSENT',
    linkedinUrl: null,
    contactSource: 'Research desk - verified by call',
    lastVerifiedAt: daysAgo(24),
    consentStatus: 'EXPLICIT_OPT_IN',
    communicationRestrictions: [],
    contactNotes: null,
    duplicateOfId: null,
    isDuplicate: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

export function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-test',
    name: 'Customer Experience Transformation 2026',
    clientBrand: 'Northwind Experience Cloud',
    campaignType: 'WEBINAR',
    topic: 'Rebuilding the customer journey after a core systems migration',
    targetBusinessProblem: 'Fragmented customer journeys after core platform migrations',
    description: null,
    targetIndustries: ['Banking', 'Insurance', 'Telecommunications'],
    targetSubIndustries: ['Retail Banking'],
    targetCountries: ['Canada', 'Mexico', 'France'],
    targetCities: [],
    targetEmployeeBands: ['BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS'],
    targetRevenueBands: ['USD_250M_1B', 'USD_1B_5B', 'OVER_5B'],
    targetTechnologies: ['Salesforce Service Cloud', 'Genesys', 'Zendesk'],
    targetJobFunctions: ['CUSTOMER_EXPERIENCE', 'CUSTOMER_SERVICE', 'CONTACT_CENTRE', 'DIGITAL_TRANSFORMATION'],
    targetRoleCategories: ['DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'BUSINESS_INFLUENCER'],
    targetSeniorities: ['C_LEVEL', 'EVP', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER'],
    preferredLanguages: ['English'],
    relevantTitleTerms: ['customer experience', 'customer journey', 'customer operations'],
    excludedTitleTerms: ['account executive', 'customer acquisition', 'sales', 'key accounts'],
    relevantDepartments: ['Customer Experience', 'Customer Operations'],
    eventDate: daysAheadAt(20, 14),
    eventTime: '14:00',
    eventTimeZone: 'UTC',
    speakerInformation: null,
    registrationUrl: 'https://example.com/register',
    whitePaperUrl: null,
    campaignCost: null,
    campaignCurrency: 'USD',
    allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'],
    status: 'ACTIVE',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

export function makeComplianceRecord(overrides: Partial<ComplianceRecord> = {}): ComplianceRecord {
  return {
    id: 'cmp-test',
    contactId: 'ct-test',
    country: 'Canada',
    consentStatus: 'EXPLICIT_OPT_IN',
    consentSource: 'Webinar registration form, double opt-in',
    consentDate: daysAgo(24),
    lawfulBasis: 'CONSENT',
    noticeProvided: true,
    optOutStatus: 'NONE',
    allowedChannels: ['EMAIL', 'PHONE'],
    blockedChannels: [],
    complianceNotes: null,
    reviewedAt: daysAgo(24),
    reviewedById: 'user-researcher',
    createdAt: daysAgo(200),
    updatedAt: daysAgo(24),
    ...overrides,
  };
}

export function makeCountryRule(overrides: Partial<CountryComplianceRule> = {}): CountryComplianceRule {
  return {
    id: 'rule-test',
    country: 'Canada',
    permittedChannels: ['EMAIL', 'PHONE', 'WHATSAPP', 'LINKEDIN', 'POST'],
    prohibitedChannels: [],
    requiresExplicitOptIn: false,
    whatsappRequiresOptIn: true,
    requiresLawfulBasis: true,
    requiresNotice: false,
    consentValidityDays: null,
    policyNotes: null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
    ...overrides,
  };
}

let eventCounter = 0;
export function makeEvent(eventType: EventType, overrides: Partial<EngagementEvent> = {}): EngagementEvent {
  eventCounter += 1;
  return {
    id: `ev-${eventCounter}`,
    campaignId: 'camp-test',
    contactId: 'ct-test',
    eventType,
    eventDate: daysAgo(10),
    metadata: null,
    pointsAwarded: 0,
    createdAt: daysAgo(10),
    ...overrides,
  };
}
