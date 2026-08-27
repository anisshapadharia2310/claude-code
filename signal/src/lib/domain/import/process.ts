import { applyMapping, validateRow, type MappedRow, type NormalizedRow, type RowIssue } from './validate';
import { findDuplicate, type DuplicateMatch, type ExistingContactKey } from './dedupe';

export type ProcessedRowStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export interface ProcessedRow {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: MappedRow;
  status: ProcessedRowStatus;
  normalized: NormalizedRow | null;
  errors: RowIssue[];
  warnings: RowIssue[];
  duplicate: DuplicateMatch;
}

export interface ImportPreview {
  rows: ProcessedRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    missingEmail: number;
    missingPhone: number;
    missingConsent: number;
    unrecognisedCountries: number;
  };
}

/**
 * Runs the full pre-import pipeline over parsed CSV records: mapping,
 * validation, normalisation and duplicate detection. Pure and synchronous, so
 * the wizard can re-run it instantly after a user corrects a row.
 */
export function processRows(
  records: Array<Record<string, string>>,
  mapping: Record<string, string | null>,
  existing: ExistingContactKey[] = [],
): ImportPreview {
  const rows: ProcessedRow[] = [];
  const acceptedSoFar: Array<{ rowNumber: number; row: NormalizedRow }> = [];

  let missingEmail = 0;
  let missingPhone = 0;
  let missingConsent = 0;
  let unrecognisedCountries = 0;

  records.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for zero-index, +1 for the header row.
    const mapped = applyMapping(raw, mapping);
    const validation = validateRow(mapped);

    let status: ProcessedRowStatus = validation.valid ? 'VALID' : 'INVALID';
    let duplicate: DuplicateMatch = {
      isDuplicate: false,
      reason: null,
      matchedContactId: null,
      matchedRowNumber: null,
      detail: 'Not checked - row is invalid.',
    };

    if (validation.valid && validation.normalized) {
      duplicate = findDuplicate(validation.normalized, existing, acceptedSoFar);
      if (duplicate.isDuplicate) {
        status = 'DUPLICATE';
      } else {
        acceptedSoFar.push({ rowNumber, row: validation.normalized });
        // Counted only for rows that will actually import.
        if (!validation.normalized.workEmail) missingEmail += 1;
        if (!validation.normalized.phoneNumber) missingPhone += 1;
        if (validation.normalized.consentStatus === 'NOT_CAPTURED') missingConsent += 1;
      }
    }

    if (validation.warnings.some((w) => w.field === 'country')) unrecognisedCountries += 1;

    rows.push({
      rowNumber,
      raw,
      mapped,
      status,
      normalized: validation.normalized,
      errors: validation.errors,
      warnings: validation.warnings,
      duplicate,
    });
  });

  return {
    rows,
    summary: {
      totalRows: rows.length,
      validRows: rows.filter((r) => r.status === 'VALID').length,
      invalidRows: rows.filter((r) => r.status === 'INVALID').length,
      duplicateRows: rows.filter((r) => r.status === 'DUPLICATE').length,
      missingEmail,
      missingPhone,
      missingConsent,
      unrecognisedCountries,
    },
  };
}
