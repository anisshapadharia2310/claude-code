/**
 * Contact list filtering, searching and sorting.
 *
 * Pure functions over already-loaded rows. Both repository implementations feed
 * the same code path, so a filter behaves identically with or without a
 * database, and the semantics are unit-testable without one.
 */
import type {
  ConsentStatus, EmailStatus, EmployeeBand, EngagementEvent, EventType, PhoneStatus,
  Priority, RoleCategory, Seniority, WhatsAppStatus,
} from '@prisma/client';
import type { CampaignContactFull } from '../repo/types';

export type SortField =
  | 'totalScore' | 'roleRelevanceScore' | 'triggerScore' | 'attendanceLikelihoodScore'
  | 'lastVerifiedAt' | 'nextFollowUpAt' | 'companyName' | 'lastName' | 'priority';

export interface ContactFilters {
  q: string;
  priority: Priority[];
  country: string[];
  industry: string[];
  employeeBand: EmployeeBand[];
  seniority: Seniority[];
  roleCategory: RoleCategory[];
  technology: string[];
  trigger: string[];
  scoreMin: number | null;
  scoreMax: number | null;
  emailStatus: EmailStatus[];
  phoneStatus: PhoneStatus[];
  whatsappStatus: WhatsAppStatus[];
  consentStatus: ConsentStatus[];
  eventType: EventType | null;
  assignedTo: string | null;
  status: string[];
  reviewOnly: boolean;
  verifiedBefore: string | null;
  sort: SortField;
  dir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: ContactFilters = {
  q: '', priority: [], country: [], industry: [], employeeBand: [], seniority: [],
  roleCategory: [], technology: [], trigger: [], scoreMin: null, scoreMax: null,
  emailStatus: [], phoneStatus: [], whatsappStatus: [], consentStatus: [],
  eventType: null, assignedTo: null, status: [], reviewOnly: false,
  verifiedBefore: null, sort: 'totalScore', dir: 'desc',
};

type RawParams = Record<string, string | string[] | undefined>;

function list(params: RawParams, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => entry.split(',')).map((entry) => entry.trim()).filter(Boolean);
}

function single(params: RawParams, key: string): string | null {
  const value = params[key];
  const text = Array.isArray(value) ? value[0] : value;
  return text && text.trim() ? text.trim() : null;
}

function number(params: RawParams, key: string): number | null {
  const value = single(params, key);
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const SORT_FIELDS: SortField[] = [
  'totalScore', 'roleRelevanceScore', 'triggerScore', 'attendanceLikelihoodScore',
  'lastVerifiedAt', 'nextFollowUpAt', 'companyName', 'lastName', 'priority',
];

export function parseContactFilters(params: RawParams): ContactFilters {
  const sortRaw = single(params, 'sort');
  const sort = SORT_FIELDS.includes(sortRaw as SortField) ? (sortRaw as SortField) : 'totalScore';
  const dir = single(params, 'dir') === 'asc' ? 'asc' : 'desc';

  return {
    q: single(params, 'q') ?? '',
    priority: list(params, 'priority') as Priority[],
    country: list(params, 'country'),
    industry: list(params, 'industry'),
    employeeBand: list(params, 'employeeBand') as EmployeeBand[],
    seniority: list(params, 'seniority') as Seniority[],
    roleCategory: list(params, 'roleCategory') as RoleCategory[],
    technology: list(params, 'technology'),
    trigger: list(params, 'trigger'),
    scoreMin: number(params, 'scoreMin'),
    scoreMax: number(params, 'scoreMax'),
    emailStatus: list(params, 'emailStatus') as EmailStatus[],
    phoneStatus: list(params, 'phoneStatus') as PhoneStatus[],
    whatsappStatus: list(params, 'whatsappStatus') as WhatsAppStatus[],
    consentStatus: list(params, 'consentStatus') as ConsentStatus[],
    eventType: (single(params, 'eventType') as EventType | null) ?? null,
    assignedTo: single(params, 'assignedTo'),
    status: list(params, 'status'),
    reviewOnly: single(params, 'reviewOnly') === '1',
    verifiedBefore: single(params, 'verifiedBefore'),
    sort,
    dir,
  };
}

/** True when any filter is narrowing the list, used to show a "clear" affordance. */
export function hasActiveFilters(filters: ContactFilters): boolean {
  const { sort, dir, ...rest } = filters;
  void sort; void dir;
  return Object.values(rest).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null && value !== '' && value !== false);
}

function matchesSearch(row: CampaignContactFull, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const contact = row.contact;
  const haystack = [
    contact.firstName, contact.lastName, `${contact.firstName} ${contact.lastName}`,
    contact.jobTitle, contact.normalizedJobTitle, contact.department,
    contact.workEmail, contact.phoneNumber,
    contact.account.companyName, contact.account.domain, contact.account.industry,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(needle));
}

const TRIGGER_PREDICATES: Record<string, (row: CampaignContactFull) => boolean> = {
  TRANSFORMATION: (row) => row.contact.account.transformationActivity,
  HIRING: (row) => row.contact.account.relevantOpenJobPostings > 0,
  EXPANSION: (row) => row.contact.account.expansionActivity,
  MERGER: (row) => row.contact.account.mergerOrAcquisitionActivity,
  LEADERSHIP: (row) => row.contact.account.leadershipChange,
  REGULATORY: (row) => row.contact.account.regulatoryPressure,
  STATED_PRIORITY: (row) => Boolean(row.contact.account.publiclyStatedPriority),
  ANY: (row) => row.triggerScore > 0,
  NONE: (row) => row.triggerScore === 0,
};

export interface FilterContext {
  /** Engagement events keyed by contact id, for the engagement-event filter. */
  eventsByContact?: Map<string, EngagementEvent[]>;
}

export function applyContactFilters(
  rows: CampaignContactFull[],
  filters: ContactFilters,
  context: FilterContext = {},
): CampaignContactFull[] {
  const verifiedBefore = filters.verifiedBefore ? new Date(filters.verifiedBefore) : null;

  return rows.filter((row) => {
    const contact = row.contact;
    const account = contact.account;

    if (!matchesSearch(row, filters.q)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(row.priority)) return false;
    if (filters.country.length > 0 && !filters.country.includes(account.country)) return false;
    if (filters.industry.length > 0 && !filters.industry.includes(account.industry)) return false;
    if (filters.employeeBand.length > 0 && !filters.employeeBand.includes(account.employeeBand)) return false;
    if (filters.seniority.length > 0 && !filters.seniority.includes(contact.seniority)) return false;
    if (filters.roleCategory.length > 0 && !filters.roleCategory.includes(contact.roleCategory)) return false;
    if (filters.emailStatus.length > 0 && !filters.emailStatus.includes(contact.emailStatus)) return false;
    if (filters.phoneStatus.length > 0 && !filters.phoneStatus.includes(contact.phoneStatus)) return false;
    if (filters.whatsappStatus.length > 0 && !filters.whatsappStatus.includes(contact.whatsappStatus)) return false;
    if (filters.consentStatus.length > 0 && !filters.consentStatus.includes(contact.consentStatus)) return false;
    if (filters.status.length > 0 && !filters.status.includes(row.currentStatus)) return false;
    if (filters.assignedTo && row.assignedTo !== filters.assignedTo) return false;
    if (filters.reviewOnly && !row.humanReviewRequired) return false;
    if (filters.scoreMin !== null && row.totalScore < filters.scoreMin) return false;
    if (filters.scoreMax !== null && row.totalScore > filters.scoreMax) return false;

    if (filters.technology.length > 0) {
      const stack = [...account.existingTechnology, ...account.competitorTechnology]
        .map((value) => value.toLowerCase());
      if (!filters.technology.some((value) => stack.includes(value.toLowerCase()))) return false;
    }

    if (filters.trigger.length > 0) {
      const matches = filters.trigger.some((key) => TRIGGER_PREDICATES[key]?.(row) ?? false);
      if (!matches) return false;
    }

    if (verifiedBefore) {
      if (!contact.lastVerifiedAt) return true; // never verified counts as older than any date
      if (contact.lastVerifiedAt >= verifiedBefore) return false;
    }

    if (filters.eventType) {
      const events = context.eventsByContact?.get(contact.id) ?? [];
      if (!events.some((event) => event.eventType === filters.eventType)) return false;
    }

    return true;
  });
}

const PRIORITY_ORDER: Record<Priority, number> = {
  P1: 0, P2: 1, P3: 2, COMPLIANCE_HOLD: 3, REJECT: 4, UNSCORED: 5,
};

export function sortContacts(rows: CampaignContactFull[], sort: SortField, dir: 'asc' | 'desc'): CampaignContactFull[] {
  const factor = dir === 'asc' ? 1 : -1;
  const value = (row: CampaignContactFull): number | string => {
    switch (sort) {
      case 'lastVerifiedAt': return row.contact.lastVerifiedAt?.getTime() ?? 0;
      case 'nextFollowUpAt': return row.nextFollowUpAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      case 'companyName': return row.contact.account.companyName.toLowerCase();
      case 'lastName': return row.contact.lastName.toLowerCase();
      case 'priority': return PRIORITY_ORDER[row.priority];
      default: return row[sort];
    }
  };

  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right)) * factor;
    }
    if (left === right) return b.totalScore - a.totalScore;
    return (left - right) * factor;
  });
}

/** Distinct values for the filter dropdowns, derived from the loaded rows. */
export function filterOptions(rows: CampaignContactFull[]) {
  const countries = new Set<string>();
  const industries = new Set<string>();
  const technologies = new Set<string>();
  for (const row of rows) {
    countries.add(row.contact.account.country);
    industries.add(row.contact.account.industry);
    for (const tech of row.contact.account.existingTechnology) technologies.add(tech);
    for (const tech of row.contact.account.competitorTechnology) technologies.add(tech);
  }
  return {
    countries: [...countries].sort(),
    industries: [...industries].sort(),
    technologies: [...technologies].sort(),
  };
}
