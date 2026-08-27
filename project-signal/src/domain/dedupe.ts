/**
 * Duplicate detection.
 *
 * Four keys, in descending confidence: work email, normalized phone,
 * company domain plus person name, and normalized company name plus person
 * name. Matching is done against existing records AND within the import batch
 * itself, because a single file usually contains its own duplicates.
 */
import { companyKey, normalizeDomain, normalizeEmail, normalizePersonName, normalizePhone } from './normalize';

export type DuplicateMatchType = 'EMAIL' | 'PHONE' | 'DOMAIN_AND_NAME' | 'COMPANY_AND_NAME';

export interface DedupeRecord {
  id: string;
  firstName: string;
  lastName: string;
  workEmail?: string | null;
  phoneNumber?: string | null;
  companyName?: string | null;
  domain?: string | null;
  country?: string | null;
}

export interface DuplicateMatch {
  existingId: string;
  matchType: DuplicateMatchType;
  confidence: 'HIGH' | 'MEDIUM';
  detail: string;
}

export interface DedupeIndex {
  byEmail: Map<string, string>;
  byPhone: Map<string, string>;
  byDomainName: Map<string, string>;
  byCompanyName: Map<string, string>;
  size: number;
}

function personKey(firstName: string, lastName: string): string {
  return `${normalizePersonName(firstName)}|${normalizePersonName(lastName)}`.toLowerCase();
}

function domainOf(record: DedupeRecord): string | null {
  return normalizeDomain(record.domain) ?? normalizeDomain(record.workEmail);
}

export function createDedupeIndex(records: DedupeRecord[] = []): DedupeIndex {
  const index: DedupeIndex = {
    byEmail: new Map(),
    byPhone: new Map(),
    byDomainName: new Map(),
    byCompanyName: new Map(),
    size: 0,
  };
  for (const record of records) addToIndex(index, record);
  return index;
}

export function addToIndex(index: DedupeIndex, record: DedupeRecord): void {
  const email = normalizeEmail(record.workEmail);
  if (email) index.byEmail.set(email, record.id);

  const phone = normalizePhone(record.phoneNumber, record.country);
  if (phone) index.byPhone.set(phone, record.id);

  const name = personKey(record.firstName, record.lastName);
  const domain = domainOf(record);
  if (domain && name.replace('|', '')) index.byDomainName.set(`${domain}::${name}`, record.id);

  const company = companyKey(record.companyName);
  if (company && name.replace('|', '')) index.byCompanyName.set(`${company}::${name}`, record.id);

  index.size += 1;
}

/**
 * Find the strongest duplicate match for a candidate, or null.
 * Never matches a record against itself.
 */
export function findDuplicate(candidate: DedupeRecord, index: DedupeIndex): DuplicateMatch | null {
  const email = normalizeEmail(candidate.workEmail);
  if (email) {
    const hit = index.byEmail.get(email);
    if (hit && hit !== candidate.id) {
      return { existingId: hit, matchType: 'EMAIL', confidence: 'HIGH', detail: `Same work email (${email}).` };
    }
  }

  const phone = normalizePhone(candidate.phoneNumber, candidate.country);
  if (phone) {
    const hit = index.byPhone.get(phone);
    if (hit && hit !== candidate.id) {
      return { existingId: hit, matchType: 'PHONE', confidence: 'HIGH', detail: `Same phone number (${phone}).` };
    }
  }

  const name = personKey(candidate.firstName, candidate.lastName);
  if (name.replace('|', '')) {
    const domain = domainOf(candidate);
    if (domain) {
      const hit = index.byDomainName.get(`${domain}::${name}`);
      if (hit && hit !== candidate.id) {
        return {
          existingId: hit,
          matchType: 'DOMAIN_AND_NAME',
          confidence: 'HIGH',
          detail: `Same person name at the same company domain (${domain}).`,
        };
      }
    }

    const company = companyKey(candidate.companyName);
    if (company) {
      const hit = index.byCompanyName.get(`${company}::${name}`);
      if (hit && hit !== candidate.id) {
        return {
          existingId: hit,
          matchType: 'COMPANY_AND_NAME',
          confidence: 'MEDIUM',
          detail: `Same person name at the same company (${candidate.companyName}).`,
        };
      }
    }
  }

  return null;
}
