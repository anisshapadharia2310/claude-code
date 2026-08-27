import {
  ClientRelationship,
  ConsentRequirement,
  ConsentStatus,
  DataConfidence,
  DecisionRole,
  EmailStatus,
  EmployeeBand,
  LawfulBasis,
  OptOutStatus,
  PhoneStatus,
  RevenueBand,
  RoleCategory,
  Seniority,
  TriggerVerification,
  WhatsAppStatus,
  Channel,
} from '@prisma/client';
import type {
  AccountInput,
  CampaignInput,
  ComplianceRecordInput,
  ContactInput,
  CountryRuleInput,
} from '../types';

/** Fixed "now" so every test is deterministic. */
export const NOW = new Date('2026-03-01T12:00:00Z');
export const RECENTLY = new Date('2026-02-01T00:00:00Z');
export const LONG_AGO = new Date('2024-01-01T00:00:00Z');

export function makeAccount(overrides: Partial<AccountInput> = {}): AccountInput {
  return {
    id: 'acc_1',
    companyName: 'Northwind Utilities',
    domain: 'northwind.example',
    industry: 'Utilities',
    subIndustry: 'Electricity Distribution',
    country: 'Canada',
    city: 'Toronto',
    region: 'NAM',
    timeZone: 'America/Toronto',
    employeeBand: EmployeeBand.BAND_5001_10000,
    revenueBand: RevenueBand.FROM_1B_5B,
    existingTechnology: ['Salesforce Service Cloud'],
    competitorTechnology: [],
    namedAccountStatus: true,
    existingClientRelationship: ClientRelationship.NONE,
    recentBusinessTrigger: 'a publicly announced customer-service modernisation programme',
    relevantOpenJobPostings: 4,
    transformationActivity: true,
    expansionActivity: true,
    mergerOrAcquisitionActivity: false,
    leadershipChange: true,
    regulatoryPressure: true,
    publiclyStatedPriority: true,
    triggerVerification: TriggerVerification.VERIFIED,
    accountDataConfidence: DataConfidence.HIGH,
    ...overrides,
  };
}

export function makeContact(overrides: Partial<ContactInput> = {}): ContactInput {
  return {
    id: 'con_1',
    firstName: 'Amara',
    lastName: 'Osei',
    jobTitle: 'Head of Customer Experience Transformation',
    normalizedJobTitle: 'head of customer experience transformation',
    department: 'Customer Experience',
    jobFunction: 'Customer Experience',
    roleCategory: RoleCategory.DIRECT_OWNER,
    seniority: Seniority.HEAD,
    decisionRole: DecisionRole.DECISION_MAKER,
    ownsBudget: true,
    influencesDecision: true,
    directProblemResponsibility: true,
    roleConfidence: DataConfidence.HIGH,
    country: 'Canada',
    city: 'Toronto',
    timeZone: 'America/Toronto',
    language: 'English',
    workEmail: 'amara.osei@northwind.example',
    emailStatus: EmailStatus.VERIFIED,
    emailConfidence: DataConfidence.HIGH,
    phoneNumber: '+14165550123',
    phoneStatus: PhoneStatus.VERIFIED,
    whatsappStatus: WhatsAppStatus.AVAILABLE_NO_CONSENT,
    contactSource: 'Research - company website',
    lastVerifiedAt: RECENTLY,
    consentStatus: ConsentStatus.LEGITIMATE_INTEREST,
    communicationRestrictions: [],
    isDuplicate: false,
    ...overrides,
  };
}

export function makeCampaign(overrides: Partial<CampaignInput> = {}): CampaignInput {
  return {
    id: 'cam_1',
    name: 'CX Transformation Webinar',
    campaignType: 'WEBINAR',
    topic: 'Customer Experience Transformation',
    targetBusinessProblem: 'Fragmented customer journeys across service channels',
    targetIndustries: ['Utilities', 'Banking', 'Telecommunications'],
    targetSubIndustries: ['Electricity Distribution'],
    targetCountries: ['Canada', 'Mexico', 'France'],
    targetCities: [],
    targetEmployeeBands: [EmployeeBand.BAND_1001_5000, EmployeeBand.BAND_5001_10000],
    targetRevenueBands: [RevenueBand.FROM_1B_5B],
    targetTechnologies: ['Salesforce Service Cloud', 'Genesys'],
    targetJobFunctions: ['Customer Experience', 'Customer Service', 'Customer Operations'],
    targetRoleCategories: [
      RoleCategory.DIRECT_OWNER,
      RoleCategory.OPERATIONAL_OWNER,
      RoleCategory.EXECUTIVE_SPONSOR,
    ],
    targetSeniorities: [
      Seniority.C_LEVEL,
      Seniority.VP,
      Seniority.HEAD,
      Seniority.DIRECTOR,
      Seniority.SENIOR_MANAGER,
    ],
    preferredLanguages: ['English', 'French'],
    relevantRoleCategories: [
      RoleCategory.DIRECT_OWNER,
      RoleCategory.OPERATIONAL_OWNER,
      RoleCategory.EXECUTIVE_SPONSOR,
      RoleCategory.BUSINESS_INFLUENCER,
    ],
    problemOwnershipTerms: [
      'customer experience',
      'customer service',
      'customer operations',
      'service delivery',
      'contact centre',
      'customer',
    ],
    surfaceTitleKeywords: ['customer'],
    eventDate: new Date('2026-04-15T14:00:00Z'),
    eventTimeZone: 'UTC',
    registrationUrl: 'https://example.com/register',
    whitePaperUrl: null,
    scoringWeights: null,
    ...overrides,
  };
}

export function makeComplianceRecord(
  overrides: Partial<ComplianceRecordInput> = {},
): ComplianceRecordInput {
  return {
    country: 'Canada',
    consentStatus: ConsentStatus.LEGITIMATE_INTEREST,
    consentSource: 'Website enquiry form',
    consentDate: RECENTLY,
    lawfulBasis: LawfulBasis.LEGITIMATE_INTEREST,
    noticeProvided: true,
    optOutStatus: OptOutStatus.NONE,
    allowedChannels: [Channel.EMAIL, Channel.PHONE],
    blockedChannels: [],
    ...overrides,
  };
}

export function makeCountryRule(overrides: Partial<CountryRuleInput> = {}): CountryRuleInput {
  return {
    country: 'Canada',
    emailRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT,
    phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT,
    whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED,
    requiredFields: ['consentStatus', 'lawfulBasis'],
    noticeRequired: false,
    ...overrides,
  };
}
