import type {
  Channel,
  ClientRelationship,
  ConsentStatus,
  DataConfidence,
  DecisionRole,
  EmailStatus,
  EmployeeBand,
  EventType,
  LawfulBasis,
  OptOutStatus,
  PhoneStatus,
  Priority,
  RevenueBand,
  RoleCategory,
  Seniority,
  TriggerVerification,
  WhatsAppStatus,
  ConsentRequirement,
} from '@prisma/client';

/**
 * The domain layer works on structural subsets of the Prisma models. Prisma
 * records satisfy these shapes directly, but tests (and any future data source)
 * can build them by hand without touching a database.
 */

export interface AccountInput {
  id?: string;
  companyName: string;
  domain?: string | null;
  industry: string;
  subIndustry?: string | null;
  country: string;
  city?: string | null;
  region?: string | null;
  timeZone?: string | null;
  employeeBand: EmployeeBand;
  revenueBand: RevenueBand;
  existingTechnology: string[];
  competitorTechnology: string[];
  namedAccountStatus: boolean;
  existingClientRelationship: ClientRelationship;
  recentBusinessTrigger?: string | null;
  relevantOpenJobPostings: number;
  transformationActivity: boolean;
  expansionActivity: boolean;
  mergerOrAcquisitionActivity: boolean;
  leadershipChange: boolean;
  regulatoryPressure: boolean;
  publiclyStatedPriority: boolean;
  triggerVerification: TriggerVerification;
  accountDataConfidence: DataConfidence;
}

export interface ContactInput {
  id?: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  normalizedJobTitle: string;
  department?: string | null;
  jobFunction?: string | null;
  roleCategory: RoleCategory;
  seniority: Seniority;
  decisionRole: DecisionRole;
  ownsBudget: boolean;
  influencesDecision: boolean;
  directProblemResponsibility: boolean;
  roleConfidence: DataConfidence;
  country: string;
  city?: string | null;
  timeZone?: string | null;
  language?: string | null;
  workEmail?: string | null;
  emailStatus: EmailStatus;
  emailConfidence: DataConfidence;
  phoneNumber?: string | null;
  phoneStatus: PhoneStatus;
  whatsappStatus: WhatsAppStatus;
  contactSource?: string | null;
  lastVerifiedAt?: Date | null;
  consentStatus: ConsentStatus;
  communicationRestrictions: string[];
  isDuplicate: boolean;
}

export interface CampaignInput {
  id?: string;
  name: string;
  campaignType: 'WHITE_PAPER' | 'WEBINAR';
  topic: string;
  targetBusinessProblem: string;
  targetIndustries: string[];
  targetSubIndustries: string[];
  targetCountries: string[];
  targetCities: string[];
  targetEmployeeBands: EmployeeBand[];
  targetRevenueBands: RevenueBand[];
  targetTechnologies: string[];
  targetJobFunctions: string[];
  targetRoleCategories: RoleCategory[];
  targetSeniorities: Seniority[];
  preferredLanguages: string[];
  relevantRoleCategories: RoleCategory[];
  problemOwnershipTerms: string[];
  surfaceTitleKeywords: string[];
  eventDate?: Date | null;
  eventTimeZone?: string | null;
  registrationUrl?: string | null;
  whitePaperUrl?: string | null;
  scoringWeights?: unknown;
}

export interface EngagementEventInput {
  eventType: EventType;
  eventDate: Date;
  metadata?: Record<string, unknown> | null;
}

export interface ComplianceRecordInput {
  country: string;
  consentStatus: ConsentStatus;
  consentSource?: string | null;
  consentDate?: Date | null;
  lawfulBasis: LawfulBasis;
  noticeProvided: boolean;
  optOutStatus: OptOutStatus;
  allowedChannels: Channel[];
  blockedChannels: Channel[];
}

export interface CountryRuleInput {
  country: string;
  emailRequirement: ConsentRequirement;
  phoneRequirement: ConsentRequirement;
  whatsappRequirement: ConsentRequirement;
  requiredFields: string[];
  noticeRequired: boolean;
}

/** One awarded (or withheld) criterion. Every point in SIGNAL has one of these. */
export interface ScoreLine {
  component: 'A_FIT' | 'B_ROLE' | 'C_TRIGGER' | 'D_ENGAGEMENT' | 'E_DATA_QUALITY' | 'F_ATTENDANCE';
  code: string;
  label: string;
  points: number;
  max: number;
  /** Plain-language justification shown in the UI tooltip. */
  reason: string;
}

export interface GateCheck {
  key: string;
  label: string;
  passed: boolean;
  /** A failed blocking check prevents any priority above REJECT/HOLD. */
  blocking: boolean;
  detail: string;
}

export interface RelevanceGateResult {
  passed: boolean;
  /** False when the role is neither a direct nor an indirect owner of the problem. */
  roleEligibleForP1: boolean;
  checks: GateCheck[];
  failures: string[];
}

export type ComplianceOutcome = 'PASS' | 'HOLD' | 'BLOCK';

export interface ChannelPermission {
  channel: Channel;
  allowed: boolean;
  requiresReview: boolean;
  reason: string;
}

export interface ComplianceGateResult {
  outcome: ComplianceOutcome;
  passed: boolean;
  checks: GateCheck[];
  permissions: ChannelPermission[];
  allowedChannels: Channel[];
  missingFields: string[];
  warnings: string[];
}

export interface RoleClassification {
  category: RoleCategory;
  confidence: DataConfidence;
  /** Evidence that supported the classification, shown in the review queue. */
  signals: string[];
  /** Explicitly recorded so the UI can say why a keyword was NOT enough. */
  rejectedSignals: string[];
  ownershipEvidenceCount: number;
}

export interface ComponentScores {
  fit: number;
  roleRelevance: number;
  trigger: number;
  engagement: number;
  dataQuality: number;
  attendance: number;
}

export interface Playbook {
  recommendedChannel: Channel | null;
  recommendedNextAction: string;
  callerOpening: string;
  emailAngle: string;
  whatsappRecommended: boolean;
  whatsappReason: string;
}

export interface ScoringResult {
  components: ComponentScores;
  baseTotal: number;
  engagementBonus: number;
  totalScore: number;
  priority: Priority;
  priorityReasons: string[];
  explanation: ScoreLine[];
  relevance: RelevanceGateResult;
  compliance: ComplianceGateResult;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  playbook: Playbook;
  surfaceLevelMatch: boolean;
}

export interface AccountSignal {
  accountId: string;
  companyName: string;
  contactsInCampaign: number;
  registered: number;
  attended: number;
  engaged: number;
  meetingsRequested: number;
  distinctEngagedStakeholders: number;
  /** Displayed next to - never folded into - the individual contact score. */
  multiplier: number;
  label: string;
  note: string | null;
}
