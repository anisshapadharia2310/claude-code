/**
 * Seeds a realistic working data set: three campaigns, twenty-four companies,
 * and well over a hundred contacts spanning eight countries, deliberately
 * including the false positives (title keyword without ownership), the stale
 * records, the duplicates and the compliance gaps that SIGNAL exists to catch.
 *
 * Everything is generated from a fixed pseudo-random seed so repeated runs
 * produce the same database.
 */
import {
  CallOutcome,
  CampaignStatus,
  CampaignType,
  ConsentStatus,
  DataConfidence,
  DecisionRole,
  DeliveryStatus,
  EmailStatus,
  EmailType,
  EmployeeBand,
  EventType,
  LawfulBasis,
  OptOutStatus,
  Channel,
  PhoneStatus,
  Prisma,
  PrismaClient,
  RevenueBand,
  RoleCategory,
  ScoreChangeSource,
  Seniority,
  TriggerVerification,
  UserRole,
  WhatsAppStatus,
} from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { rescoreCampaign } from '../src/lib/services/scoring-service';
import { normalizeJobTitle } from '../src/lib/domain/role-taxonomy';
import { COUNTRY_LANGUAGES, COUNTRY_REGIONS, COUNTRY_TIME_ZONES } from '../src/lib/domain/import/normalize';
import { pointsForEvent } from '../src/lib/domain/engagement';
import { ARCHETYPES, COMPANIES, COUNTRY_RULES, NAMES_BY_COUNTRY, type Archetype } from './seed-data';

const prisma = new PrismaClient();

/** Deterministic PRNG so the seed is reproducible. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260827);
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)];
const chance = (probability: number) => random() < probability;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'signal123';

async function reset() {
  // Order matters: children before parents.
  await prisma.scoreAudit.deleteMany();
  await prisma.callActivity.deleteMany();
  await prisma.emailActivity.deleteMany();
  await prisma.whatsAppActivity.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.engagementEvent.deleteMany();
  await prisma.campaignContact.deleteMany();
  await prisma.complianceRecord.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.countryComplianceRule.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const passwordHash = hashPassword(SEED_PASSWORD);
  const users = [
    { name: 'Alex Whitfield', email: 'admin@signal.example', role: UserRole.ADMIN },
    { name: 'Priya Nandakumar', email: 'manager@signal.example', role: UserRole.MANAGER },
    { name: 'Tom Bergstrom', email: 'researcher@signal.example', role: UserRole.RESEARCHER },
    { name: 'Sara Okonkwo', email: 'researcher2@signal.example', role: UserRole.RESEARCHER },
    { name: 'Diego Salas', email: 'caller@signal.example', role: UserRole.CALLER },
    { name: 'Meera Iyer', email: 'caller2@signal.example', role: UserRole.CALLER },
  ];
  return prisma.$transaction(
    users.map((user) => prisma.user.create({ data: { ...user, passwordHash } })),
  );
}

async function seedCountryRules() {
  await prisma.countryComplianceRule.createMany({ data: COUNTRY_RULES });
}

const BROAD_EMPLOYEE_BANDS: EmployeeBand[] = [
  EmployeeBand.BAND_501_1000,
  EmployeeBand.BAND_1001_5000,
  EmployeeBand.BAND_5001_10000,
  EmployeeBand.BAND_10001_PLUS,
];
const BROAD_REVENUE_BANDS: RevenueBand[] = [
  RevenueBand.FROM_50M_250M,
  RevenueBand.FROM_250M_1B,
  RevenueBand.FROM_1B_5B,
  RevenueBand.GT_5B,
];
const TARGET_COUNTRIES = [
  'Canada',
  'Mexico',
  'France',
  'Colombia',
  'United Arab Emirates',
  'Saudi Arabia',
  'Oman',
  'Egypt',
];
const RELEVANT_ROLES: RoleCategory[] = [
  RoleCategory.DIRECT_OWNER,
  RoleCategory.OPERATIONAL_OWNER,
  RoleCategory.EXECUTIVE_SPONSOR,
  RoleCategory.BUSINESS_INFLUENCER,
];
const TARGET_SENIORITIES: Seniority[] = [
  Seniority.C_LEVEL,
  Seniority.EVP,
  Seniority.SVP,
  Seniority.VP,
  Seniority.HEAD,
  Seniority.DIRECTOR,
  Seniority.SENIOR_MANAGER,
  Seniority.MANAGER,
];

async function seedCampaigns() {
  const cx = await prisma.campaign.create({
    data: {
      name: 'Customer Experience Transformation 2026',
      clientBrand: 'Aveon Digital',
      campaignType: CampaignType.WEBINAR,
      topic: 'Customer Experience Transformation',
      targetBusinessProblem: 'Fragmented customer journeys across service channels',
      description:
        'Live webinar for utilities, banking and telecommunications leaders who own end-to-end customer journeys. The client wants qualified attendees who can act on what they hear, not a large registration list.',
      targetIndustries: ['Utilities', 'Banking', 'Telecommunications', 'Retail', 'Insurance'],
      targetSubIndustries: ['Electricity Distribution', 'Retail Banking', 'Mobile Network Operator'],
      targetCountries: TARGET_COUNTRIES,
      targetCities: [],
      targetEmployeeBands: BROAD_EMPLOYEE_BANDS,
      targetRevenueBands: BROAD_REVENUE_BANDS,
      targetTechnologies: ['Salesforce Service Cloud', 'Genesys', 'Zendesk', 'Avaya'],
      targetJobFunctions: ['Customer Experience', 'Customer Service', 'Customer Operations', 'Executive'],
      targetRoleCategories: RELEVANT_ROLES,
      targetSeniorities: TARGET_SENIORITIES,
      preferredLanguages: ['English', 'French', 'Spanish', 'Arabic'],
      relevantRoleCategories: RELEVANT_ROLES,
      problemOwnershipTerms: [
        'customer experience',
        'customer operations',
        'customer service',
        'service delivery',
        'contact centre',
        'customer journey',
        'customer',
      ],
      surfaceTitleKeywords: ['customer'],
      eventDate: daysFromNow(24),
      eventTime: '14:00',
      eventTimeZone: 'UTC',
      speakerInformation: 'Hosted by Aveon Digital with a guest speaker from a European utility.',
      registrationUrl: 'https://example.com/webinars/cx-transformation-2026',
      campaignCost: new Prisma.Decimal(18500),
      currency: 'USD',
      status: CampaignStatus.ACTIVE,
    },
  });

  const automation = await prisma.campaign.create({
    data: {
      name: 'Customer Service Automation Webinar',
      clientBrand: 'Helix AI',
      campaignType: CampaignType.WEBINAR,
      topic: 'Customer Service Automation',
      targetBusinessProblem: 'High contact-centre cost per resolution and long handling times',
      description:
        'Practical session on automating tier-one service without damaging customer satisfaction. Target audience is contact-centre and service operations leadership.',
      targetIndustries: ['Banking', 'Telecommunications', 'Retail', 'Healthcare', 'Insurance'],
      targetSubIndustries: [],
      targetCountries: TARGET_COUNTRIES,
      targetCities: [],
      targetEmployeeBands: BROAD_EMPLOYEE_BANDS,
      targetRevenueBands: BROAD_REVENUE_BANDS,
      targetTechnologies: ['Genesys', 'Zendesk', 'Salesforce Service Cloud', 'Avaya'],
      targetJobFunctions: ['Customer Service', 'Customer Operations', 'Customer Experience'],
      targetRoleCategories: RELEVANT_ROLES,
      targetSeniorities: TARGET_SENIORITIES,
      preferredLanguages: ['English', 'Spanish', 'Arabic'],
      relevantRoleCategories: RELEVANT_ROLES,
      problemOwnershipTerms: [
        'customer service',
        'contact centre',
        'service desk',
        'customer operations',
        'service delivery',
        'customer',
      ],
      surfaceTitleKeywords: ['customer', 'service'],
      eventDate: daysFromNow(38),
      eventTime: '11:00',
      eventTimeZone: 'UTC',
      speakerInformation: 'Helix AI product leadership with a contact-centre operations guest.',
      registrationUrl: 'https://example.com/webinars/service-automation',
      campaignCost: new Prisma.Decimal(12250),
      currency: 'USD',
      status: CampaignStatus.ACTIVE,
    },
  });

  const energy = await prisma.campaign.create({
    data: {
      name: 'Energy and Infrastructure Digital Transformation',
      clientBrand: 'Gridwise Partners',
      campaignType: CampaignType.WHITE_PAPER,
      topic: 'Energy and Infrastructure Digital Transformation',
      targetBusinessProblem: 'Ageing asset data and manual field operations limiting network reliability',
      description:
        'White paper for operations and asset leadership in energy, utilities and infrastructure. Distribution is by email and phone follow-up; there is no live event.',
      targetIndustries: ['Energy', 'Utilities', 'Transportation and Logistics'],
      targetSubIndustries: ['Power Generation', 'Oil and Gas', 'Water and Waste'],
      targetCountries: TARGET_COUNTRIES,
      targetCities: [],
      targetEmployeeBands: BROAD_EMPLOYEE_BANDS,
      targetRevenueBands: BROAD_REVENUE_BANDS,
      targetTechnologies: ['OSIsoft PI', 'SAP', 'Salesforce Service Cloud'],
      targetJobFunctions: [
        'Operations',
        'Customer Operations',
        'Information Technology',
        'Executive',
        'Asset Management',
      ],
      targetRoleCategories: [...RELEVANT_ROLES, RoleCategory.TECHNICAL_EVALUATOR],
      targetSeniorities: TARGET_SENIORITIES,
      preferredLanguages: ['English', 'Arabic', 'Spanish', 'French'],
      relevantRoleCategories: [...RELEVANT_ROLES, RoleCategory.TECHNICAL_EVALUATOR],
      problemOwnershipTerms: [
        'asset management',
        'network operations',
        'field operations',
        'digital transformation',
        'operations',
        'customer operations',
      ],
      surfaceTitleKeywords: ['digital', 'operations'],
      eventDate: null,
      whitePaperUrl: 'https://example.com/papers/grid-reliability',
      campaignCost: new Prisma.Decimal(9400),
      currency: 'USD',
      status: CampaignStatus.ACTIVE,
    },
  });

  return { cx, automation, energy };
}

/** Trigger flags per profile. Rich accounts are what produce P1 candidates. */
function triggersFor(profile: string) {
  switch (profile) {
    case 'rich':
      return {
        relevantOpenJobPostings: 3 + Math.floor(random() * 5),
        transformationActivity: true,
        expansionActivity: true,
        mergerOrAcquisitionActivity: chance(0.3),
        leadershipChange: true,
        regulatoryPressure: true,
        publiclyStatedPriority: true,
        triggerVerification: TriggerVerification.VERIFIED,
      };
    case 'moderate':
      return {
        relevantOpenJobPostings: chance(0.5) ? 2 : 0,
        transformationActivity: chance(0.6),
        expansionActivity: chance(0.4),
        mergerOrAcquisitionActivity: chance(0.2),
        leadershipChange: chance(0.4),
        regulatoryPressure: chance(0.5),
        publiclyStatedPriority: chance(0.3),
        triggerVerification: chance(0.5)
          ? TriggerVerification.VERIFIED
          : TriggerVerification.UNVERIFIED,
      };
    case 'thin':
      return {
        relevantOpenJobPostings: chance(0.3) ? 1 : 0,
        transformationActivity: false,
        expansionActivity: chance(0.2),
        mergerOrAcquisitionActivity: false,
        leadershipChange: chance(0.2),
        regulatoryPressure: false,
        publiclyStatedPriority: false,
        triggerVerification: TriggerVerification.UNVERIFIED,
      };
    default:
      return {
        relevantOpenJobPostings: 0,
        transformationActivity: false,
        expansionActivity: false,
        mergerOrAcquisitionActivity: false,
        leadershipChange: false,
        regulatoryPressure: false,
        publiclyStatedPriority: false,
        triggerVerification: TriggerVerification.UNVERIFIED,
      };
  }
}

/** Which archetypes populate a company, based on how well researched it is. */
const ASSET_HEAVY_INDUSTRIES = ['Energy', 'Utilities', 'Transportation and Logistics'];

function archetypePlan(profile: string, industry: string): string[] {
  // Asset-heavy industries get an operations owner as well as (or instead of) a
  // customer-experience owner, which is who the infrastructure campaign wants.
  const assetHeavy = ASSET_HEAVY_INDUSTRIES.includes(industry);
  switch (profile) {
    case 'rich':
      return [
        ...(assetHeavy ? ['assetOwner'] : []),
        ...(industry === 'Energy' ? [] : ['directOwner']),
        'directOwnerUnbudgeted',
        'operationalOwner',
        'businessInfluencer',
        'executiveSponsor',
        'technicalEvaluator',
        'keywordTrap',
        'endUser',
      ];
    case 'moderate':
      return [
        ...(assetHeavy ? ['assetOwner'] : ['directOwner']),
        'directOwnerUnbudgeted',
        'operationalOwner',
        'operationalOwner',
        'businessInfluencer',
        'technicalEvaluator',
        'keywordTrap',
        'procurement',
      ];
    case 'thin':
      return [
        'operationalOwner',
        'operationalOwner',
        'businessInfluencer',
        'directOwnerUnbudgeted',
        'keywordTrap',
        'peripheral',
        'unknownRole',
      ];
    default:
      return ['peripheral', 'unknownRole', 'keywordTrap'];
  }
}

interface VerificationProfile {
  emailStatus: EmailStatus;
  phoneStatus: PhoneStatus;
  emailConfidence: DataConfidence;
  lastVerifiedAt: Date | null;
  contactSource: string | null;
}

function verificationFor(level: Archetype['verified'], stale: boolean): VerificationProfile {
  if (stale) {
    return {
      emailStatus: EmailStatus.UNVERIFIED,
      phoneStatus: PhoneStatus.UNVERIFIED,
      emailConfidence: DataConfidence.LOW,
      lastVerifiedAt: daysAgo(400 + Math.floor(random() * 200)),
      contactSource: 'Legacy list 2023',
    };
  }
  switch (level) {
    case 'full':
      return {
        emailStatus: EmailStatus.VERIFIED,
        phoneStatus: PhoneStatus.VERIFIED,
        emailConfidence: DataConfidence.HIGH,
        lastVerifiedAt: daysAgo(5 + Math.floor(random() * 40)),
        contactSource: pick(['Research - company website', 'Research - annual report', 'Verified by phone']),
      };
    case 'partial':
      return {
        emailStatus: chance(0.5) ? EmailStatus.VALID : EmailStatus.UNVERIFIED,
        phoneStatus: chance(0.4) ? PhoneStatus.VALID : PhoneStatus.UNVERIFIED,
        emailConfidence: DataConfidence.MEDIUM,
        lastVerifiedAt: daysAgo(45 + Math.floor(random() * 90)),
        contactSource: pick(['Data provider', 'Event list', 'Inbound enquiry']),
      };
    default:
      return {
        emailStatus: EmailStatus.UNVERIFIED,
        phoneStatus: PhoneStatus.MISSING,
        emailConfidence: DataConfidence.UNVERIFIED,
        lastVerifiedAt: null,
        contactSource: null,
      };
  }
}

const DIAL_PREFIX: Record<string, string> = {
  Canada: '+1416555',
  Mexico: '+525555',
  France: '+3315555',
  Colombia: '+5715555',
  'United Arab Emirates': '+9715055',
  'Saudi Arabia': '+9665055',
  Oman: '+9689555',
  Egypt: '+2010555',
  Japan: '+81355',
};

async function seedAccountsAndContacts() {
  const accounts: Array<{ id: string; country: string; companyName: string }> = [];
  const contacts: Array<{
    id: string;
    accountId: string;
    archetype: string;
    industry: string;
    country: string;
    researched: boolean;
  }> = [];

  const nameCursor: Record<string, number> = {};
  let phoneCounter = 1000;

  for (const company of COMPANIES) {
    const triggers = triggersFor(company.triggerProfile);
    const account = await prisma.account.create({
      data: {
        companyName: company.companyName,
        domain: company.domain,
        industry: company.industry,
        subIndustry: company.subIndustry,
        country: company.country,
        city: company.city,
        region: COUNTRY_REGIONS[company.country] ?? null,
        timeZone: COUNTRY_TIME_ZONES[company.country] ?? null,
        language: COUNTRY_LANGUAGES[company.country] ?? null,
        employeeBand: company.employeeBand,
        revenueBand: company.revenueBand,
        numberOfLocations: 1 + Math.floor(random() * 40),
        existingTechnology: company.existingTechnology,
        competitorTechnology: company.competitorTechnology,
        namedAccountStatus: company.namedAccountStatus,
        existingClientRelationship: company.existingClientRelationship,
        recentBusinessTrigger: company.recentBusinessTrigger,
        ...triggers,
        triggerSource: company.recentBusinessTrigger ? pick(['Company press release', 'Trade press', 'Annual report', 'Job board']) : null,
        triggerDate: company.recentBusinessTrigger ? daysAgo(10 + Math.floor(random() * 120)) : null,
        accountNotes: company.recentBusinessTrigger
          ? `Trigger: ${company.recentBusinessTrigger}.`
          : 'No verified business trigger found yet.',
        accountDataConfidence: company.dataConfidence,
      },
    });
    accounts.push({ id: account.id, country: company.country, companyName: company.companyName });

    for (const archetypeKey of archetypePlan(company.triggerProfile, company.industry)) {
      const archetype = ARCHETYPES[archetypeKey];
      const pool = NAMES_BY_COUNTRY[company.country] ?? NAMES_BY_COUNTRY.Canada;
      const cursor = (nameCursor[company.country] ?? 0) % pool.length;
      nameCursor[company.country] = cursor + 1;
      const person = pool[cursor];

      const jobTitle = pick(archetype.jobTitles);
      const stale = archetype.verified !== 'full' && chance(0.12);
      const verification = verificationFor(archetype.verified, stale);

      // A small share of contacts have no phone at all, to prove the system
      // still works using email as the qualification and nurture channel.
      const noPhone = chance(0.18);
      phoneCounter += 1;

      const optedOut = chance(0.05);
      const doNotContact = chance(0.03);
      const consentStatus = doNotContact
        ? ConsentStatus.DO_NOT_CONTACT
        : optedOut
          ? ConsentStatus.OPT_OUT
          : archetype.verified === 'full'
            ? pick([
                ConsentStatus.EXPLICIT_OPT_IN,
                ConsentStatus.EXPLICIT_OPT_IN,
                ConsentStatus.SOFT_OPT_IN,
                ConsentStatus.LEGITIMATE_INTEREST,
              ])
            : chance(0.1)
              ? ConsentStatus.NOT_CAPTURED
              : pick([
                  ConsentStatus.SOFT_OPT_IN,
                  ConsentStatus.SOFT_OPT_IN,
                  ConsentStatus.EXPLICIT_OPT_IN,
                  ConsentStatus.LEGITIMATE_INTEREST,
                ]);

      const whatsappStatus =
        consentStatus === ConsentStatus.EXPLICIT_OPT_IN && !noPhone && chance(0.6)
          ? WhatsAppStatus.AVAILABLE_OPTED_IN
          : noPhone
            ? WhatsAppStatus.NOT_AVAILABLE
            : chance(0.2)
              ? WhatsAppStatus.OPTED_OUT
              : WhatsAppStatus.AVAILABLE_NO_CONSENT;

      const emailLocal = `${person.firstName}.${person.lastName}`
        .toLowerCase()
        .replace(/[^a-z.]/g, '');

      const contact = await prisma.contact.create({
        data: {
          accountId: account.id,
          firstName: person.firstName,
          lastName: person.lastName,
          jobTitle,
          normalizedJobTitle: normalizeJobTitle(jobTitle),
          department: archetype.department || null,
          jobFunction: archetype.jobFunction || null,
          roleCategory: archetype.roleCategory,
          seniority: archetype.seniority,
          decisionRole: archetype.ownsBudget
            ? DecisionRole.DECISION_MAKER
            : archetype.influencesDecision
              ? DecisionRole.INFLUENCER
              : DecisionRole.UNKNOWN,
          ownsBudget: archetype.ownsBudget,
          influencesDecision: archetype.influencesDecision,
          directProblemResponsibility: archetype.directProblemResponsibility,
          roleRelevanceNotes: archetype.note,
          roleConfidence: stale ? DataConfidence.LOW : archetype.roleConfidence,
          tenureMonths: 6 + Math.floor(random() * 90),
          country: company.country,
          city: company.city,
          timeZone: COUNTRY_TIME_ZONES[company.country] ?? null,
          language: COUNTRY_LANGUAGES[company.country] ?? null,
          workEmail: `${emailLocal}@${company.domain}`,
          emailStatus: verification.emailStatus,
          emailConfidence: verification.emailConfidence,
          phoneNumber: noPhone ? null : `${DIAL_PREFIX[company.country] ?? '+1555'}${phoneCounter}`,
          phoneStatus: noPhone ? PhoneStatus.MISSING : verification.phoneStatus,
          whatsappStatus,
          linkedinUrl: `https://www.linkedin.com/in/${emailLocal.replace(/\./g, '-')}`,
          contactSource: verification.contactSource,
          lastVerifiedAt: verification.lastVerifiedAt,
          consentStatus,
          communicationRestrictions: doNotContact ? ['Do not contact - requested by the contact'] : [],
          contactNotes: stale ? 'Record has not been re-verified since the 2023 list purchase.' : null,
        },
      });

      // The compliance record is what the compliance gate actually reads. Some
      // are deliberately incomplete so contacts land on COMPLIANCE_HOLD.
      const complete =
        consentStatus === ConsentStatus.NOT_CAPTURED
          ? false
          : archetype.verified === 'full'
            ? true
            : chance(0.88);
      await prisma.complianceRecord.create({
        data: {
          contactId: contact.id,
          country: company.country,
          consentStatus,
          consentSource: complete ? pick(['Website enquiry form', 'Event registration', 'Inbound call', 'Webinar sign-up']) : null,
          consentDate: complete ? daysAgo(20 + Math.floor(random() * 300)) : null,
          lawfulBasis: complete
            ? consentStatus === ConsentStatus.EXPLICIT_OPT_IN
              ? LawfulBasis.CONSENT
              : LawfulBasis.LEGITIMATE_INTEREST
            : LawfulBasis.NOT_DETERMINED,
          noticeProvided: complete,
          optOutStatus: doNotContact
            ? OptOutStatus.GLOBAL_OPT_OUT
            : optedOut
              ? OptOutStatus.EMAIL_OPT_OUT
              : OptOutStatus.NONE,
          allowedChannels: complete
            ? noPhone
              ? [Channel.EMAIL]
              : [Channel.EMAIL, Channel.PHONE]
            : [],
          blockedChannels: whatsappStatus === WhatsAppStatus.OPTED_OUT ? [Channel.WHATSAPP] : [],
          complianceNotes: complete ? null : 'Incomplete - lawful basis and consent source still to be confirmed.',
          reviewedAt: complete ? daysAgo(Math.floor(random() * 60)) : null,
        },
      });

      contacts.push({
        id: contact.id,
        accountId: account.id,
        archetype: archetypeKey,
        industry: company.industry,
        country: company.country,
        researched: archetype.researched && !stale,
      });
    }
  }

  return { accounts, contacts };
}

/** A handful of duplicate records, so the gate has something real to reject. */
async function seedDuplicates(contacts: Awaited<ReturnType<typeof seedAccountsAndContacts>>['contacts']) {
  const sources = contacts.slice(0, 4);
  for (const source of sources) {
    const original = await prisma.contact.findUniqueOrThrow({ where: { id: source.id } });
    const duplicate = await prisma.contact.create({
      data: {
        accountId: original.accountId,
        firstName: original.firstName,
        lastName: original.lastName,
        jobTitle: original.jobTitle,
        normalizedJobTitle: original.normalizedJobTitle,
        department: original.department,
        jobFunction: original.jobFunction,
        roleCategory: original.roleCategory,
        seniority: original.seniority,
        decisionRole: original.decisionRole,
        ownsBudget: original.ownsBudget,
        influencesDecision: original.influencesDecision,
        directProblemResponsibility: original.directProblemResponsibility,
        roleConfidence: DataConfidence.LOW,
        country: original.country,
        city: original.city,
        timeZone: original.timeZone,
        language: original.language,
        workEmail: original.workEmail?.replace('@', '+dup@') ?? null,
        emailStatus: EmailStatus.UNVERIFIED,
        phoneNumber: original.phoneNumber,
        phoneStatus: original.phoneStatus,
        whatsappStatus: original.whatsappStatus,
        contactSource: 'Second data provider (2025 refresh)',
        lastVerifiedAt: daysAgo(200),
        consentStatus: original.consentStatus,
        isDuplicate: true,
        duplicateOfId: original.id,
        contactNotes: 'Detected as a duplicate on import: same person at the same company.',
      },
    });
    await prisma.complianceRecord.create({
      data: {
        contactId: duplicate.id,
        country: original.country,
        consentStatus: original.consentStatus,
        lawfulBasis: LawfulBasis.NOT_DETERMINED,
        complianceNotes: 'Duplicate record - do not use.',
      },
    });
    contacts.push({
      id: duplicate.id,
      accountId: original.accountId,
      archetype: 'duplicate',
      industry: '',
      country: original.country,
      researched: false,
    });
  }
}

const WHY_TEMPLATES = [
  (company: string, trigger: string) =>
    `Owns the customer experience programme at ${company} and is named in ${trigger}. Confirmed on the company website and in the annual report.`,
  (company: string, trigger: string) =>
    `Directly accountable for service operations at ${company}; ${trigger} makes this a live budget conversation this quarter.`,
  (company: string, trigger: string) =>
    `Runs the function end to end at ${company} and holds the budget. Verified against ${trigger}.`,
];

async function seedCampaignContacts(
  campaigns: Awaited<ReturnType<typeof seedCampaigns>>,
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const callers = users.filter((u) => u.role === UserRole.CALLER);
  const accounts = await prisma.account.findMany({ include: { contacts: true } });

  const campaignList = [
    { campaign: campaigns.cx, industries: ['Utilities', 'Banking', 'Telecommunications', 'Retail', 'Insurance'] },
    { campaign: campaigns.automation, industries: ['Banking', 'Telecommunications', 'Retail', 'Healthcare', 'Insurance'] },
    { campaign: campaigns.energy, industries: ['Energy', 'Utilities', 'Transportation and Logistics'] },
  ];

  for (const { campaign, industries } of campaignList) {
    for (const account of accounts) {
      // Out-of-scope accounts are still enrolled on the first campaign so the
      // relevance gate visibly rejects them rather than hiding them.
      const inScope = industries.includes(account.industry);
      if (!inScope && campaign.id !== campaigns.cx.id) continue;

      for (const contact of account.contacts) {
        const researched =
          !contact.isDuplicate &&
          contact.directProblemResponsibility &&
          contact.ownsBudget &&
          contact.roleConfidence === DataConfidence.HIGH &&
          inScope;

        await prisma.campaignContact.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            whyThisContact: researched
              ? pick(WHY_TEMPLATES)(
                  account.companyName,
                  account.recentBusinessTrigger ?? 'the transformation activity on record',
                )
              : null,
            assignedToId: chance(0.6) ? pick(callers).id : null,
            humanReviewStatus: researched ? 'APPROVED' : 'NOT_REQUIRED',
            reviewedById: researched ? users.find((u) => u.role === UserRole.RESEARCHER)?.id ?? null : null,
            reviewedAt: researched ? daysAgo(Math.floor(random() * 20)) : null,
            reviewNotes: researched ? 'Role ownership and trigger both verified against public sources.' : null,
          },
        });
      }
    }
  }
}

/** Engagement history, weighted towards the better-qualified contacts. */
async function seedEngagement(campaigns: Awaited<ReturnType<typeof seedCampaigns>>) {
  const records = await prisma.campaignContact.findMany({
    include: { contact: { select: { roleCategory: true, consentStatus: true, workEmail: true } } },
  });

  for (const record of records) {
    const owner =
      record.contact.roleCategory === RoleCategory.DIRECT_OWNER ||
      record.contact.roleCategory === RoleCategory.OPERATIONAL_OWNER;
    const contactable =
      record.contact.consentStatus !== ConsentStatus.DO_NOT_CONTACT &&
      record.contact.consentStatus !== ConsentStatus.OPT_OUT;
    if (!contactable) continue;

    const events: Array<{ type: EventType; date: Date; metadata?: Prisma.InputJsonValue }> = [];
    const outreachChance = owner ? 0.8 : 0.35;
    if (!chance(outreachChance)) continue;

    events.push({ type: EventType.EMAIL_SENT, date: daysAgo(30 + Math.floor(random() * 20)) });
    if (chance(0.85)) events.push({ type: EventType.EMAIL_DELIVERED, date: daysAgo(30) });
    if (chance(0.45)) events.push({ type: EventType.EMAIL_OPENED, date: daysAgo(28) });
    if (chance(0.2)) events.push({ type: EventType.EMAIL_CLICKED, date: daysAgo(27) });
    if (chance(owner ? 0.25 : 0.06))
      events.push({ type: EventType.POSITIVE_EMAIL_REPLY, date: daysAgo(26) });
    if (chance(0.3)) events.push({ type: EventType.WHITEPAPER_SENT, date: daysAgo(25) });
    if (chance(owner ? 0.35 : 0.1))
      events.push({ type: EventType.WHITEPAPER_DOWNLOADED, date: daysAgo(24) });

    const isWebinar = record.campaignId !== campaigns.energy.id;
    if (isWebinar && chance(owner ? 0.5 : 0.15)) {
      events.push({ type: EventType.WEBINAR_INVITATION_SENT, date: daysAgo(20) });
      const registered = chance(owner ? 0.7 : 0.3);
      if (registered) {
        events.push({
          type: EventType.WEBINAR_REGISTERED,
          date: daysAgo(18),
          metadata: { explicitRequest: chance(0.3) },
        });
        // Attendance only exists for events that have already happened; the
        // seeded webinars are upcoming, so this models a previous session.
        if (chance(0.55)) {
          events.push({ type: EventType.WEBINAR_ATTENDED, date: daysAgo(10) });
          const depth = random();
          const percent = depth > 0.7 ? 85 : depth > 0.45 ? 75 : depth > 0.2 ? 50 : 25;
          if (percent >= 50)
            events.push({
              type: EventType.WEBINAR_ATTENDANCE_50_PERCENT,
              date: daysAgo(10),
              metadata: { attendedPercent: percent },
            });
          if (percent >= 75)
            events.push({
              type: EventType.WEBINAR_ATTENDANCE_75_PERCENT,
              date: daysAgo(10),
              metadata: { attendedPercent: percent },
            });
          if (percent >= 85)
            events.push({
              type: EventType.WEBINAR_ATTENDANCE_80_PERCENT,
              date: daysAgo(10),
              metadata: { attendedPercent: percent },
            });
          if (chance(0.4)) events.push({ type: EventType.POLL_ANSWERED, date: daysAgo(10) });
          if (chance(0.25)) events.push({ type: EventType.QUESTION_ASKED, date: daysAgo(10) });
          if (chance(0.3)) events.push({ type: EventType.STAYED_FOR_QA, date: daysAgo(10) });
          if (chance(0.25)) events.push({ type: EventType.RESOURCE_DOWNLOADED, date: daysAgo(9) });
          if (chance(0.2)) events.push({ type: EventType.CTA_CLICKED, date: daysAgo(9) });
          if (chance(owner ? 0.2 : 0.05))
            events.push({ type: EventType.MEETING_REQUESTED, date: daysAgo(8) });
        } else if (chance(0.3)) {
          events.push({ type: EventType.REPLAY_WATCHED, date: daysAgo(6) });
        }
      }
    }

    if (chance(0.08)) events.push({ type: EventType.NOT_INTERESTED, date: daysAgo(12) });

    await prisma.engagementEvent.createMany({
      data: events.map((event) => ({
        campaignId: record.campaignId,
        contactId: record.contactId,
        eventType: event.type,
        eventDate: event.date,
        pointsAwarded: pointsForEvent(event.type),
        metadata: event.metadata ?? Prisma.JsonNull,
      })),
    });
  }
}

/** A sample of logged calls and emails so the outreach screens have history. */
async function seedActivities(users: Awaited<ReturnType<typeof seedUsers>>) {
  const callers = users.filter((u) => u.role === UserRole.CALLER);
  const records = await prisma.campaignContact.findMany({
    where: { assignedToId: { not: null } },
    include: { contact: { select: { firstName: true, workEmail: true, phoneNumber: true } }, campaign: { select: { topic: true } } },
    take: 60,
  });

  for (const record of records) {
    if (record.contact.phoneNumber && chance(0.5)) {
      const outcome = pick([
        CallOutcome.CONNECTED,
        CallOutcome.NO_ANSWER,
        CallOutcome.CALLBACK_REQUESTED,
        CallOutcome.INTERESTED,
        CallOutcome.SENT_WEBINAR_LINK,
        CallOutcome.NOT_INTERESTED,
        CallOutcome.NO_ANSWER,
      ]);
      await prisma.callActivity.create({
        data: {
          campaignContactId: record.id,
          callerId: pick(callers).id,
          callDate: daysAgo(Math.floor(random() * 21)),
          outcome,
          notes:
            outcome === CallOutcome.CONNECTED || outcome === CallOutcome.INTERESTED
              ? `Discussed ${record.campaign.topic.toLowerCase()}; asked for the agenda before committing.`
              : 'Left a voicemail with a call-back number.',
          nextAction: outcome === CallOutcome.CALLBACK_REQUESTED ? 'Call back as agreed.' : 'Follow up by email.',
          nextFollowUpAt: chance(0.5) ? daysFromNow(2 + Math.floor(random() * 10)) : null,
        },
      });
    }

    if (record.contact.workEmail && chance(0.45)) {
      await prisma.emailActivity.create({
        data: {
          campaignContactId: record.id,
          emailType: pick([EmailType.WEBINAR_INVITE, EmailType.WHITEPAPER_OFFER, EmailType.FOLLOW_UP]),
          subject: `${record.campaign.topic} - a practical session for your team`,
          body: `Hi ${record.contact.firstName},\n\nSharing an invitation to our upcoming session on ${record.campaign.topic.toLowerCase()}.\n\nBest regards,\nThe team`,
          sentAt: daysAgo(Math.floor(random() * 25)),
          deliveryStatus: chance(0.9) ? DeliveryStatus.DELIVERED : DeliveryStatus.BOUNCED,
          openedAt: chance(0.5) ? daysAgo(Math.floor(random() * 20)) : null,
          provider: 'log',
        },
      });
    }
  }
}

async function main() {
  console.log('Resetting database...');
  await reset();

  console.log('Seeding users and compliance rules...');
  const users = await seedUsers();
  await seedCountryRules();

  console.log('Seeding campaigns...');
  const campaigns = await seedCampaigns();

  console.log('Seeding accounts and contacts...');
  const { contacts } = await seedAccountsAndContacts();
  await seedDuplicates(contacts);

  console.log('Enrolling contacts in campaigns...');
  await seedCampaignContacts(campaigns, users);

  console.log('Seeding engagement history...');
  await seedEngagement(campaigns);
  await seedActivities(users);

  console.log('Scoring every campaign...');
  const admin = users.find((u) => u.role === UserRole.ADMIN)!;
  for (const campaign of [campaigns.cx, campaigns.automation, campaigns.energy]) {
    const result = await rescoreCampaign(campaign.id, {
      source: ScoreChangeSource.SCORING_ENGINE,
      reason: 'Initial scoring run after seeding.',
      changedById: admin.id,
    });
    console.log(`  ${campaign.name}: ${result.scored} scored`, result.byPriority);
  }

  const totals = await prisma.campaignContact.groupBy({ by: ['priority'], _count: true });
  const counts = Object.fromEntries(totals.map((t) => [t.priority, t._count]));
  console.log('\nOverall priority distribution:', counts);
  console.log('Accounts:', await prisma.account.count());
  console.log('Contacts:', await prisma.contact.count());
  console.log('Campaign contacts:', await prisma.campaignContact.count());
  console.log('Engagement events:', await prisma.engagementEvent.count());
  console.log(`\nSign in with any seeded user, password: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
