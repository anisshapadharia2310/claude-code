/**
 * Seed dataset builder.
 *
 * Expands the compact contact specifications into complete records, derives
 * everything that would normally be derived at import time (normalized title,
 * seniority, role category, contact details, compliance record) and generates a
 * realistic engagement history.
 *
 * The same builder feeds the Prisma seed script and the in-memory repository,
 * so both data sources contain byte-identical data.
 */
import type { Prisma } from '@prisma/client';
import { classifyRole } from '@/domain/taxonomy';
import { inferSeniority, normalizeJobTitle } from '@/domain/normalize';
import { resolveCountry } from '@/domain/countries';
import { pointsForEvent } from '@/domain/engagement';
import type {
  ConsentStatus, DataConfidence, DecisionRole, EmailStatus, EventType,
  PhoneStatus, WhatsAppStatus,
} from '@prisma/client';
import { SEED_ACCOUNTS, type SeedAccount } from './accounts';
import { CAMPAIGN_CX, CAMPAIGN_ENERGY, CAMPAIGN_SERVICE, SEED_CAMPAIGNS, type SeedCampaign } from './campaigns';
import { CONTACT_SEEDS, type ContactSeedSpec, type QualityTier } from './contacts';

const DAY = 86_400_000;
const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY);

/** Deterministic 32-bit hash, so every seed run produces the same dataset. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pseudo-random generator seeded from a string. */
function rng(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

interface TierProfile {
  emailStatus: EmailStatus;
  emailConfidence: number;
  phoneStatus: PhoneStatus;
  hasPhone: boolean;
  verifiedDaysAgo: number | null;
  contactSource: string | null;
  consentStatus: ConsentStatus;
  roleConfidence: DataConfidence;
}

const TIER_PROFILES: Record<QualityTier, TierProfile> = {
  A: {
    emailStatus: 'VERIFIED', emailConfidence: 96, phoneStatus: 'VERIFIED', hasPhone: true,
    verifiedDaysAgo: 24, contactSource: 'Research desk - verified by call',
    consentStatus: 'EXPLICIT_OPT_IN', roleConfidence: 'HIGH',
  },
  B: {
    emailStatus: 'VALID', emailConfidence: 82, phoneStatus: 'VALID', hasPhone: true,
    verifiedDaysAgo: 118, contactSource: 'Vendor list - sampled and checked',
    consentStatus: 'LEGITIMATE_INTEREST', roleConfidence: 'MEDIUM',
  },
  C: {
    emailStatus: 'VALID', emailConfidence: 78, phoneStatus: 'MISSING', hasPhone: false,
    verifiedDaysAgo: 141, contactSource: 'Company website research',
    consentStatus: 'LEGITIMATE_INTEREST', roleConfidence: 'MEDIUM',
  },
  D: {
    emailStatus: 'UNVERIFIED', emailConfidence: 44, phoneStatus: 'UNVERIFIED', hasPhone: true,
    verifiedDaysAgo: null, contactSource: 'Vendor list - unverified',
    consentStatus: 'LEGITIMATE_INTEREST', roleConfidence: 'LOW',
  },
  E: {
    emailStatus: 'UNVERIFIED', emailConfidence: 30, phoneStatus: 'UNVERIFIED', hasPhone: true,
    verifiedDaysAgo: 712, contactSource: 'Legacy list (2024 refresh)',
    consentStatus: 'NOT_CAPTURED', roleConfidence: 'LOW',
  },
};

/** Which campaigns an account's contacts belong to, by industry. */
function campaignsForAccount(account: SeedAccount): string[] {
  const customerIndustries = ['Banking', 'Insurance', 'Telecommunications', 'Retail', 'Airlines', 'Real Estate'];
  const serviceIndustries = [...customerIndustries, 'Healthcare'];
  const assetIndustries = [
    'Energy and Utilities', 'Oil and Gas', 'Water Utilities', 'Transport Infrastructure',
    'Manufacturing', 'Transport and Logistics',
  ];
  const campaigns: string[] = [];
  if (customerIndustries.includes(account.industry)) campaigns.push(CAMPAIGN_CX);
  if (serviceIndustries.includes(account.industry)) campaigns.push(CAMPAIGN_SERVICE);
  if (assetIndustries.includes(account.industry)) campaigns.push(CAMPAIGN_ENERGY);
  return campaigns;
}

function asciiSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export interface BuiltContact {
  contact: Prisma.ContactCreateManyInput & { id: string };
  compliance: Prisma.ComplianceRecordCreateManyInput & { id: string };
  campaigns: string[];
  spec: ContactSeedSpec;
}

export interface SeedDataset {
  users: Array<Prisma.UserCreateManyInput & { id: string }>;
  countryRules: Array<Prisma.CountryComplianceRuleCreateManyInput & { id: string }>;
  accounts: SeedAccount[];
  campaigns: SeedCampaign[];
  contacts: Array<Prisma.ContactCreateManyInput & { id: string }>;
  complianceRecords: Array<Prisma.ComplianceRecordCreateManyInput & { id: string }>;
  memberships: Array<{ campaignId: string; contactId: string }>;
  events: Array<Prisma.EngagementEventCreateManyInput & { id: string }>;
}

/** Demo users, one per role plus two extra callers. */
export function buildUsers(passwordHash: string): Array<Prisma.UserCreateManyInput & { id: string }> {
  return [
    { id: 'user-admin', name: 'Avery Sinclair', email: 'admin@signal.agency', role: 'ADMIN', passwordHash },
    { id: 'user-manager', name: 'Priya Raghavan', email: 'manager@signal.agency', role: 'MANAGER', passwordHash },
    { id: 'user-researcher', name: 'Tomas Egeland', email: 'researcher@signal.agency', role: 'RESEARCHER', passwordHash },
    { id: 'user-researcher-2', name: 'Ines Ferreira', email: 'researcher2@signal.agency', role: 'RESEARCHER', passwordHash },
    { id: 'user-caller', name: 'Dani Okafor', email: 'caller@signal.agency', role: 'CALLER', passwordHash },
    { id: 'user-caller-2', name: 'Marco Bianchi', email: 'caller2@signal.agency', role: 'CALLER', passwordHash },
  ];
}

export function buildCountryRules(): Array<Prisma.CountryComplianceRuleCreateManyInput & { id: string }> {
  const base: Omit<Prisma.CountryComplianceRuleCreateManyInput, 'id' | 'country' | 'policyNotes'> = {
    permittedChannels: ['EMAIL', 'PHONE', 'WHATSAPP', 'LINKEDIN', 'POST'],
    prohibitedChannels: [],
    requiresExplicitOptIn: false,
    whatsappRequiresOptIn: true,
    requiresLawfulBasis: true,
    requiresNotice: false,
    consentValidityDays: null,
  };
  return [
    {
      id: 'rule-canada', country: 'Canada', ...base,
      permittedChannels: ['EMAIL', 'PHONE', 'LINKEDIN', 'POST'],
      policyNotes: 'Canadian anti-spam rules require a documented basis for commercial electronic messages. WhatsApp is off by agency policy pending counsel review.',
    },
    {
      id: 'rule-france', country: 'France', ...base,
      requiresNotice: true, consentValidityDays: 1095,
      policyNotes: 'Privacy notice must be recorded as provided. Consent older than three years is treated as stale.',
    },
    { id: 'rule-mexico', country: 'Mexico', ...base, policyNotes: 'Privacy notice recommended at first contact.' },
    { id: 'rule-colombia', country: 'Colombia', ...base, policyNotes: 'Registro Nacional de Bases de Datos obligations apply to the client, not the agency; confirm per campaign.' },
    { id: 'rule-uae', country: 'United Arab Emirates', ...base, policyNotes: 'WhatsApp is common in market but still requires a documented opt-in under agency policy.' },
    { id: 'rule-saudi', country: 'Saudi Arabia', ...base, policyNotes: 'Arabic-language notice preferred. WhatsApp requires documented opt-in.' },
    { id: 'rule-oman', country: 'Oman', ...base, policyNotes: null },
    { id: 'rule-egypt', country: 'Egypt', ...base, policyNotes: 'Data protection law implementation is evolving; confirm before each campaign launch.' },
    {
      id: 'rule-us', country: 'United States', ...base,
      permittedChannels: ['EMAIL', 'PHONE', 'LINKEDIN', 'POST'],
      policyNotes: 'State-level rules vary. Do-not-call screening required before dialling.',
    },
    { id: 'rule-uk', country: 'United Kingdom', ...base, permittedChannels: ['EMAIL', 'PHONE', 'LINKEDIN', 'POST'], requiresNotice: true, policyNotes: null },
  ];
}

function buildContact(spec: ContactSeedSpec, account: SeedAccount): BuiltContact {
  const flags = spec.flags ?? '';
  const profile = TIER_PROFILES[spec.tier];
  const random = rng(spec.id);

  const normalizedJobTitle = normalizeJobTitle(spec.title);
  const seniority = inferSeniority(normalizedJobTitle);

  const directProblemResponsibility = flags.includes('D');
  const ownsBudget = flags.includes('B');
  const influencesDecision = flags.includes('I') || ownsBudget;

  const classification = classifyRole({
    normalizedJobTitle,
    department: spec.dept ?? null,
    seniority,
    ownsBudget,
    influencesDecision,
    directProblemResponsibility,
  });

  const decisionRole: DecisionRole = ownsBudget
    ? 'DECISION_MAKER'
    : influencesDecision
      ? 'INFLUENCER'
      : classification.roleCategory === 'PROCUREMENT'
        ? 'GATEKEEPER'
        : classification.roleCategory === 'TECHNICAL_EVALUATOR'
          ? 'EVALUATOR'
          : classification.roleCategory === 'END_USER'
            ? 'END_USER'
            : 'UNKNOWN';

  const countryInfo = resolveCountry(account.country);
  const domain = account.domain ?? 'example.com';
  const localPart = `${asciiSlug(spec.first)}.${asciiSlug(spec.last)}`;
  const phoneDigits = String(600000000 + Math.floor(random() * 399999999));
  const phoneNumber = profile.hasPhone
    ? `${countryInfo?.callingCode ?? '+1'}${phoneDigits.slice(0, 9)}`
    : null;

  const optedOut = flags.includes('O');
  const doNotContact = flags.includes('N');
  const incompleteCompliance = flags.includes('H');
  const whatsappOptIn = flags.includes('W');
  const isDuplicate = flags.includes('X');

  const consentStatus: ConsentStatus = doNotContact
    ? 'DO_NOT_CONTACT'
    : optedOut
      ? 'OPT_OUT'
      : profile.consentStatus;

  const whatsappStatus: WhatsAppStatus = doNotContact || optedOut
    ? 'OPTED_OUT'
    : whatsappOptIn
      ? 'AVAILABLE_OPTED_IN'
      : profile.hasPhone
        ? 'AVAILABLE_NO_CONSENT'
        : 'NOT_AVAILABLE';

  // A duplicate record deliberately carries a slightly worse role confidence:
  // it is the second, weaker source for the same person.
  const roleConfidence: DataConfidence = isDuplicate ? 'LOW' : profile.roleConfidence;

  const contact: Prisma.ContactCreateManyInput & { id: string } = {
    id: spec.id,
    accountId: account.id,
    firstName: spec.first,
    lastName: spec.last,
    jobTitle: spec.title,
    normalizedJobTitle,
    department: spec.dept ?? null,
    roleCategory: classification.roleCategory,
    seniority,
    decisionRole,
    ownsBudget,
    influencesDecision,
    directProblemResponsibility,
    roleRelevanceNotes: classification.explanation,
    roleConfidence,
    tenureMonths: spec.tenureMonths ?? null,
    country: account.country,
    city: account.city ?? null,
    timeZone: account.timeZone ?? countryInfo?.defaultTimeZone ?? null,
    language: account.language ?? countryInfo?.defaultLanguage ?? null,
    workEmail: `${localPart}@${domain}`,
    emailStatus: profile.emailStatus,
    emailConfidence: profile.emailConfidence,
    phoneNumber,
    phoneStatus: profile.hasPhone ? profile.phoneStatus : 'MISSING',
    whatsappStatus,
    linkedinUrl: `https://www.linkedin.com/in/${localPart}-${spec.id.slice(-4)}`,
    contactSource: profile.contactSource,
    lastVerifiedAt: profile.verifiedDaysAgo === null ? null : daysAgo(profile.verifiedDaysAgo),
    consentStatus,
    communicationRestrictions: [],
    contactNotes: spec.notes ?? null,
    duplicateOfId: spec.duplicateOf ?? null,
    isDuplicate,
  };

  const compliance: Prisma.ComplianceRecordCreateManyInput & { id: string } = {
    id: `cmp-${spec.id}`,
    contactId: spec.id,
    country: account.country,
    consentStatus,
    consentSource: incompleteCompliance || consentStatus === 'NOT_CAPTURED'
      ? null
      : consentStatus === 'EXPLICIT_OPT_IN'
        ? 'Webinar registration form, double opt-in'
        : 'Public professional profile and company website',
    consentDate: incompleteCompliance || consentStatus === 'NOT_CAPTURED' ? null : daysAgo(profile.verifiedDaysAgo ?? 200),
    lawfulBasis: incompleteCompliance
      ? 'NOT_DETERMINED'
      : consentStatus === 'EXPLICIT_OPT_IN'
        ? 'CONSENT'
        : consentStatus === 'DO_NOT_CONTACT' || consentStatus === 'OPT_OUT'
          ? 'NOT_DETERMINED'
          : 'LEGITIMATE_INTEREST',
    noticeProvided: !incompleteCompliance,
    optOutStatus: doNotContact ? 'GLOBAL_OPT_OUT' : optedOut ? 'EMAIL_OPT_OUT' : 'NONE',
    allowedChannels: doNotContact
      ? []
      : whatsappOptIn
        ? ['EMAIL', 'PHONE', 'WHATSAPP']
        : ['EMAIL', 'PHONE'],
    blockedChannels: doNotContact ? ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'] : [],
    complianceNotes: spec.notes ?? null,
    reviewedAt: profile.verifiedDaysAgo === null ? null : daysAgo(profile.verifiedDaysAgo),
    reviewedById: 'user-researcher',
  };

  return {
    contact,
    compliance,
    campaigns: spec.campaigns ?? campaignsForAccount(account),
    spec,
  };
}

/**
 * Generate a plausible engagement history.
 *
 * Contacts who genuinely own the problem engage more often than contacts who
 * do not, which is what makes the "old method versus SIGNAL" comparison on the
 * dashboard meaningful rather than decorative.
 */
function buildEventsFor(
  built: BuiltContact,
  campaignId: string,
  campaign: SeedCampaign,
): Array<Prisma.EngagementEventCreateManyInput & { id: string }> {
  const events: Array<Prisma.EngagementEventCreateManyInput & { id: string }> = [];
  const random = rng(`${built.contact.id}:${campaignId}`);
  const flags = built.spec.flags ?? '';

  if (flags.includes('N') || flags.includes('O') || flags.includes('X')) return events;

  const strong = flags.includes('D') && (built.spec.tier === 'A' || built.spec.tier === 'B');
  const medium = flags.includes('I') || flags.includes('B');

  let sequence = 0;
  const push = (eventType: EventType, daysBack: number, metadata?: Prisma.InputJsonValue): void => {
    sequence += 1;
    events.push({
      id: `ev-${built.contact.id}-${campaignId.slice(5, 12)}-${sequence}`,
      campaignId,
      contactId: built.contact.id,
      eventType,
      eventDate: daysAgo(daysBack),
      metadata: metadata ?? undefined,
      pointsAwarded: pointsForEvent(eventType),
    });
  };

  const engagementRoll = random();
  const engages = strong ? engagementRoll < 0.85 : medium ? engagementRoll < 0.45 : engagementRoll < 0.15;
  if (!engages) return events;

  if (campaign.campaignType === 'WHITE_PAPER') {
    push('EMAIL_SENT', 30);
    push('EMAIL_DELIVERED', 30);
    push('EMAIL_OPENED', 29);
    if (random() < 0.7) push('WHITEPAPER_SENT', 28);
    if (random() < 0.65) push('WHITEPAPER_DELIVERED', 28);
    if (random() < 0.6) push('WHITEPAPER_OPENED', 27);
    if (random() < 0.5) push('WHITEPAPER_DOWNLOADED', 26);
    if (strong && random() < 0.5) push('RESOURCE_DOWNLOADED', 24);
    if (strong && random() < 0.35) push('POSITIVE_EMAIL_REPLY', 23);
    if (strong && random() < 0.2) push('MEETING_REQUESTED', 20, { source: 'reply to white paper' });
    return events;
  }

  // Webinar campaigns.
  push('WEBINAR_INVITATION_SENT', 26);
  push('EMAIL_SENT', 26);
  push('EMAIL_DELIVERED', 26);
  if (random() < 0.85) push('EMAIL_OPENED', 25);
  if (random() < 0.55) push('EMAIL_CLICKED', 24);
  if (strong && random() < 0.4) push('POSITIVE_EMAIL_REPLY', 23);
  if (random() < 0.45) push('WHITEPAPER_DOWNLOADED', 22);

  const registers = strong ? random() < 0.75 : random() < 0.3;
  if (!registers) return events;

  const eventDate = campaign.eventDate ? new Date(campaign.eventDate) : null;
  const eventDaysBack = eventDate ? Math.round((Date.now() - eventDate.getTime()) / DAY) : -10;
  const registrationDaysBack = eventDaysBack + 12;
  push('WEBINAR_REGISTERED', registrationDaysBack, { early: true });

  // Only campaigns whose event has already happened produce attendance.
  if (eventDaysBack <= 0) {
    if (random() < 0.3) push('CALL_CALLBACK_REQUESTED', registrationDaysBack - 2, { explicitLinkRequest: true });
    return events;
  }

  const attends = strong ? random() < 0.8 : random() < 0.45;
  if (!attends) return events;

  push('WEBINAR_ATTENDED', eventDaysBack);
  push('WEBINAR_ATTENDANCE_50_PERCENT', eventDaysBack);
  if (random() < 0.75) push('WEBINAR_ATTENDANCE_75_PERCENT', eventDaysBack);
  if (random() < 0.55) push('WEBINAR_ATTENDANCE_80_PERCENT', eventDaysBack);
  if (random() < 0.5) push('POLL_ANSWERED', eventDaysBack);
  if (random() < 0.35) push('STAYED_FOR_QA', eventDaysBack);
  if (strong && random() < 0.3) push('QUESTION_ASKED', eventDaysBack, { question: 'How do you sequence this against a core migration?' });
  if (random() < 0.3) push('CTA_CLICKED', eventDaysBack - 1);
  if (random() < 0.25) push('REPLAY_WATCHED', eventDaysBack - 3);
  if (strong && random() < 0.3) push('MEETING_REQUESTED', eventDaysBack - 2, { source: 'post-webinar CTA' });

  return events;
}

export function buildDataset(passwordHash: string): SeedDataset {
  const accountsById = new Map(SEED_ACCOUNTS.map((account) => [account.id, account]));
  const campaignsById = new Map(SEED_CAMPAIGNS.map((campaign) => [campaign.id, campaign]));

  const built: BuiltContact[] = [];
  for (const spec of CONTACT_SEEDS) {
    const account = accountsById.get(spec.account);
    if (!account) throw new Error(`Seed contact ${spec.id} references unknown account ${spec.account}`);
    built.push(buildContact(spec, account));
  }

  const memberships: Array<{ campaignId: string; contactId: string }> = [];
  const events: Array<Prisma.EngagementEventCreateManyInput & { id: string }> = [];

  for (const entry of built) {
    for (const campaignId of entry.campaigns) {
      const campaign = campaignsById.get(campaignId);
      if (!campaign) continue;
      memberships.push({ campaignId, contactId: entry.contact.id });
      events.push(...buildEventsFor(entry, campaignId, campaign));
    }
  }

  return {
    users: buildUsers(passwordHash),
    countryRules: buildCountryRules(),
    accounts: SEED_ACCOUNTS,
    campaigns: SEED_CAMPAIGNS,
    contacts: built.map((entry) => entry.contact),
    complianceRecords: built.map((entry) => entry.compliance),
    memberships,
    events,
  };
}
