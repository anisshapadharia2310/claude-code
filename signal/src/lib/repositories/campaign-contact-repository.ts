import {
  ConsentStatus,
  DecisionRole,
  EmailStatus,
  EmployeeBand,
  EventType,
  PhoneStatus,
  Prisma,
  Priority,
  RoleCategory,
  Seniority,
  WhatsAppStatus,
} from '@prisma/client';
import { prisma } from '../db';

export interface ContactFilters {
  campaignId?: string;
  q?: string;
  priority?: Priority[];
  country?: string[];
  industry?: string[];
  employeeBand?: EmployeeBand[];
  seniority?: Seniority[];
  roleCategory?: RoleCategory[];
  decisionRole?: DecisionRole[];
  technology?: string;
  trigger?: 'ANY' | 'TRANSFORMATION' | 'HIRING' | 'MERGER' | 'LEADERSHIP' | 'REGULATORY';
  minScore?: number;
  maxScore?: number;
  emailStatus?: EmailStatus[];
  phoneStatus?: PhoneStatus[];
  whatsappStatus?: WhatsAppStatus[];
  consentStatus?: ConsentStatus[];
  engagementEvent?: EventType;
  assignedToId?: string;
  reviewPending?: boolean;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const SORTABLE: Record<string, (dir: Prisma.SortOrder) => Prisma.CampaignContactOrderByWithRelationInput> = {
  totalScore: (dir) => ({ totalScore: dir }),
  roleRelevanceScore: (dir) => ({ roleRelevanceScore: dir }),
  triggerScore: (dir) => ({ triggerScore: dir }),
  attendanceLikelihoodScore: (dir) => ({ attendanceLikelihoodScore: dir }),
  dataQualityScore: (dir) => ({ dataQualityScore: dir }),
  lastVerifiedAt: (dir) => ({ contact: { lastVerifiedAt: dir } }),
  nextFollowUpAt: (dir) => ({ nextFollowUpAt: dir }),
  companyName: (dir) => ({ contact: { account: { companyName: dir } } }),
};

/** Translates the filter object into a Prisma where clause. */
export function buildWhere(filters: ContactFilters): Prisma.CampaignContactWhereInput {
  const where: Prisma.CampaignContactWhereInput = {};
  const contact: Prisma.ContactWhereInput = {};
  const account: Prisma.AccountWhereInput = {};

  if (filters.campaignId) where.campaignId = filters.campaignId;
  if (filters.priority?.length) where.priority = { in: filters.priority };
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.reviewPending) where.humanReviewStatus = 'PENDING';

  if (filters.minScore !== undefined || filters.maxScore !== undefined) {
    where.totalScore = {
      gte: filters.minScore ?? undefined,
      lte: filters.maxScore ?? undefined,
    };
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { contact: { firstName: { contains: q, mode: 'insensitive' } } },
      { contact: { lastName: { contains: q, mode: 'insensitive' } } },
      { contact: { jobTitle: { contains: q, mode: 'insensitive' } } },
      { contact: { workEmail: { contains: q, mode: 'insensitive' } } },
      { contact: { account: { companyName: { contains: q, mode: 'insensitive' } } } },
      { contact: { account: { domain: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  if (filters.country?.length) contact.country = { in: filters.country };
  if (filters.seniority?.length) contact.seniority = { in: filters.seniority };
  if (filters.roleCategory?.length) contact.roleCategory = { in: filters.roleCategory };
  if (filters.decisionRole?.length) contact.decisionRole = { in: filters.decisionRole };
  if (filters.emailStatus?.length) contact.emailStatus = { in: filters.emailStatus };
  if (filters.phoneStatus?.length) contact.phoneStatus = { in: filters.phoneStatus };
  if (filters.whatsappStatus?.length) contact.whatsappStatus = { in: filters.whatsappStatus };
  if (filters.consentStatus?.length) contact.consentStatus = { in: filters.consentStatus };

  if (filters.industry?.length) account.industry = { in: filters.industry };
  if (filters.employeeBand?.length) account.employeeBand = { in: filters.employeeBand };
  if (filters.technology) {
    account.OR = [
      { existingTechnology: { has: filters.technology } },
      { competitorTechnology: { has: filters.technology } },
    ];
  }

  switch (filters.trigger) {
    case 'TRANSFORMATION':
      account.transformationActivity = true;
      break;
    case 'HIRING':
      account.relevantOpenJobPostings = { gt: 0 };
      break;
    case 'MERGER':
      account.mergerOrAcquisitionActivity = true;
      break;
    case 'LEADERSHIP':
      account.leadershipChange = true;
      break;
    case 'REGULATORY':
      account.regulatoryPressure = true;
      break;
    case 'ANY':
      account.OR = [
        ...(account.OR ?? []),
        { transformationActivity: true },
        { expansionActivity: true },
        { mergerOrAcquisitionActivity: true },
        { leadershipChange: true },
        { regulatoryPressure: true },
        { relevantOpenJobPostings: { gt: 0 } },
      ];
      break;
    default:
      break;
  }

  if (Object.keys(account).length > 0) contact.account = account;
  if (Object.keys(contact).length > 0) where.contact = contact;

  // Engagement filter needs the event table, joined through the contact.
  if (filters.engagementEvent) {
    where.contact = {
      ...(where.contact as Prisma.ContactWhereInput),
      engagementEvents: { some: { eventType: filters.engagementEvent } },
    };
  }

  return where;
}

export const campaignContactListInclude = {
  contact: { include: { account: true } },
  campaign: { select: { id: true, name: true, campaignType: true, topic: true } },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.CampaignContactInclude;

export type CampaignContactListItem = Prisma.CampaignContactGetPayload<{
  include: typeof campaignContactListInclude;
}>;

export async function searchCampaignContacts(filters: ContactFilters) {
  const where = buildWhere(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, filters.pageSize ?? 50);
  const direction: Prisma.SortOrder = filters.direction === 'asc' ? 'asc' : 'desc';
  const orderBy = (SORTABLE[filters.sort ?? 'totalScore'] ?? SORTABLE.totalScore)(direction);

  const [rows, total] = await Promise.all([
    prisma.campaignContact.findMany({
      where,
      include: campaignContactListInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaignContact.count({ where }),
  ]);

  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Every row matching the filters, for CSV export. */
export async function exportCampaignContacts(filters: ContactFilters) {
  return prisma.campaignContact.findMany({
    where: buildWhere(filters),
    include: campaignContactListInclude,
    orderBy: { totalScore: 'desc' },
    take: 10000,
  });
}

/** Distinct values used to populate the filter dropdowns. */
export async function getFilterOptions() {
  const [countries, industries, technologies, users] = await Promise.all([
    prisma.contact.findMany({ distinct: ['country'], select: { country: true }, orderBy: { country: 'asc' } }),
    prisma.account.findMany({ distinct: ['industry'], select: { industry: true }, orderBy: { industry: 'asc' } }),
    prisma.account.findMany({ select: { existingTechnology: true, competitorTechnology: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true } }),
  ]);

  const techSet = new Set<string>();
  for (const account of technologies) {
    account.existingTechnology.forEach((t) => techSet.add(t));
    account.competitorTechnology.forEach((t) => techSet.add(t));
  }

  return {
    countries: countries.map((c) => c.country),
    industries: industries.map((i) => i.industry),
    technologies: Array.from(techSet).sort(),
    users,
  };
}
