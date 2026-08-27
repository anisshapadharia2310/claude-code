import type { NormalizedRow } from './validate';

/** A contact already in the database, reduced to its comparison keys. */
export interface ExistingContactKey {
  contactId: string;
  email: string | null;
  phoneComparable: string | null;
  companyKey: string;
  domain: string | null;
  personKey: string;
}

export type DuplicateReason =
  | 'EMAIL'
  | 'PHONE'
  | 'DOMAIN_AND_NAME'
  | 'COMPANY_AND_NAME'
  | 'WITHIN_FILE';

export interface DuplicateMatch {
  isDuplicate: boolean;
  reason: DuplicateReason | null;
  matchedContactId: string | null;
  matchedRowNumber: number | null;
  detail: string;
}

const NO_MATCH: DuplicateMatch = {
  isDuplicate: false,
  reason: null,
  matchedContactId: null,
  matchedRowNumber: null,
  detail: 'No duplicate match found.',
};

/**
 * Duplicate detection across four keys, in descending order of confidence:
 * email, phone, company domain + person name, company name + person name.
 * Also catches duplicates that appear twice within the same file.
 */
export function findDuplicate(
  row: NormalizedRow,
  existing: ExistingContactKey[],
  seenInFile: Array<{ rowNumber: number; row: NormalizedRow }> = [],
): DuplicateMatch {
  for (const seen of seenInFile) {
    if (row.workEmail && seen.row.workEmail === row.workEmail) {
      return {
        isDuplicate: true,
        reason: 'WITHIN_FILE',
        matchedContactId: null,
        matchedRowNumber: seen.rowNumber,
        detail: `Same email as row ${seen.rowNumber} in this file.`,
      };
    }
    if (
      row.personKey === seen.row.personKey &&
      (row.companyKey === seen.row.companyKey ||
        (!!row.domain && row.domain === seen.row.domain))
    ) {
      return {
        isDuplicate: true,
        reason: 'WITHIN_FILE',
        matchedContactId: null,
        matchedRowNumber: seen.rowNumber,
        detail: `Same person at the same company as row ${seen.rowNumber} in this file.`,
      };
    }
  }

  for (const candidate of existing) {
    if (row.workEmail && candidate.email && candidate.email === row.workEmail) {
      return {
        isDuplicate: true,
        reason: 'EMAIL',
        matchedContactId: candidate.contactId,
        matchedRowNumber: null,
        detail: `Existing contact with the same email address (${row.workEmail}).`,
      };
    }
  }

  for (const candidate of existing) {
    if (
      row.phoneComparable &&
      candidate.phoneComparable &&
      candidate.phoneComparable === row.phoneComparable
    ) {
      return {
        isDuplicate: true,
        reason: 'PHONE',
        matchedContactId: candidate.contactId,
        matchedRowNumber: null,
        detail: 'Existing contact with the same phone number.',
      };
    }
  }

  for (const candidate of existing) {
    if (
      row.domain &&
      candidate.domain === row.domain &&
      candidate.personKey === row.personKey
    ) {
      return {
        isDuplicate: true,
        reason: 'DOMAIN_AND_NAME',
        matchedContactId: candidate.contactId,
        matchedRowNumber: null,
        detail: `Same person name at the same company domain (${row.domain}).`,
      };
    }
  }

  for (const candidate of existing) {
    if (candidate.companyKey === row.companyKey && candidate.personKey === row.personKey) {
      return {
        isDuplicate: true,
        reason: 'COMPANY_AND_NAME',
        matchedContactId: candidate.contactId,
        matchedRowNumber: null,
        detail: `Same person name at ${row.companyName}.`,
      };
    }
  }

  return NO_MATCH;
}
