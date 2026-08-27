import {
  ConsentStatus,
  DecisionRole,
  EmailStatus,
  EmployeeBand,
  EventType,
  PhoneStatus,
  Priority,
  RoleCategory,
  Seniority,
  WhatsAppStatus,
} from '@prisma/client';
import type { ContactFilters } from './repositories/campaign-contact-repository';

type Params = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(',')).map((v) => v.trim()).filter(Boolean);
}

function enumList<T extends Record<string, string>>(
  value: string | string[] | undefined,
  enumObject: T,
): Array<T[keyof T]> {
  return list(value).filter((v): v is T[keyof T] => v in enumObject) as Array<T[keyof T]>;
}

/** Parses URL search params into the typed filter object used by the repository. */
export function parseContactFilters(params: Params): ContactFilters {
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    campaignId: single('campaign') || undefined,
    q: single('q') || undefined,
    priority: enumList(params.priority, Priority),
    country: list(params.country),
    industry: list(params.industry),
    employeeBand: enumList(params.employeeBand, EmployeeBand),
    seniority: enumList(params.seniority, Seniority),
    roleCategory: enumList(params.roleCategory, RoleCategory),
    decisionRole: enumList(params.decisionRole, DecisionRole),
    technology: single('technology') || undefined,
    trigger: (single('trigger') as ContactFilters['trigger']) || undefined,
    minScore: single('minScore') ? Number(single('minScore')) : undefined,
    maxScore: single('maxScore') ? Number(single('maxScore')) : undefined,
    emailStatus: enumList(params.emailStatus, EmailStatus),
    phoneStatus: enumList(params.phoneStatus, PhoneStatus),
    whatsappStatus: enumList(params.whatsappStatus, WhatsAppStatus),
    consentStatus: enumList(params.consentStatus, ConsentStatus),
    engagementEvent: (single('engagementEvent') as EventType) || undefined,
    assignedToId: single('assignedTo') || undefined,
    reviewPending: single('reviewPending') === '1',
    sort: single('sort') || 'totalScore',
    direction: single('direction') === 'asc' ? 'asc' : 'desc',
    page: single('page') ? Number(single('page')) : 1,
    pageSize: single('pageSize') ? Number(single('pageSize')) : 50,
  };
}

/** Rebuilds a query string, used by the filter bar and pagination links. */
export function buildQuery(params: Params, overrides: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry) search.append(key, entry);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    search.delete(key);
    if (value) search.set(key, value);
  }
  return search.toString();
}
