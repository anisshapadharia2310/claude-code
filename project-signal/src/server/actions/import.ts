'use server';

import { revalidatePath } from 'next/cache';
import { assertPermission } from '../auth/guards';
import { getRepository } from '../repo';
import {
  commitImport, suggestMapping, validateImport, type ColumnMapping, type CommitResult,
  type ImportValidationResult,
} from '../services/import';
import { parseCsv } from '@/lib/csv';
import type { DedupeRecord } from '@/domain/dedupe';

/** Existing records the importer de-duplicates against. */
async function existingRecords(): Promise<DedupeRecord[]> {
  const repo = await getRepository();
  const contacts = await repo.listContacts();
  return contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    workEmail: contact.workEmail,
    phoneNumber: contact.phoneNumber,
    companyName: contact.account.companyName,
    domain: contact.account.domain,
    country: contact.country,
  }));
}

export interface ParseResponse {
  ok: boolean;
  error?: string;
  headers?: string[];
  mapping?: ColumnMapping;
  rowCount?: number;
  preview?: string[][];
}

/** Step 1: read the headers and propose a column mapping. */
export async function parseCsvAction(text: string): Promise<ParseResponse> {
  try {
    await assertPermission('importContacts');
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) return { ok: false, error: 'The file has no header row.' };
    if (parsed.rows.length === 0) return { ok: false, error: 'The file has a header row but no data rows.' };
    return {
      ok: true,
      headers: parsed.headers,
      mapping: suggestMapping(parsed.headers),
      rowCount: parsed.rows.length,
      preview: parsed.rows.slice(0, 5),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not read the file.' };
  }
}

export interface ValidateResponse {
  ok: boolean;
  error?: string;
  result?: ImportValidationResult;
}

/** Step 2: validate, normalize and de-duplicate every row. */
export async function validateImportAction(text: string, mapping: ColumnMapping): Promise<ValidateResponse> {
  try {
    await assertPermission('importContacts');
    const parsed = parseCsv(text);
    const result = validateImport(parsed, mapping, await existingRecords());
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Validation failed.' };
  }
}

export interface CommitResponse {
  ok: boolean;
  error?: string;
  result?: CommitResult;
}

/** Step 3: write the accepted rows and score them. */
export async function commitImportAction(
  text: string,
  mapping: ColumnMapping,
  includeIndexes: number[],
  campaignIds: string[],
  includeDuplicates: boolean,
): Promise<CommitResponse> {
  try {
    const user = await assertPermission('importContacts');
    if (campaignIds.length === 0) return { ok: false, error: 'Choose at least one campaign to import into.' };

    const repo = await getRepository();
    const parsed = parseCsv(text);
    const validation = validateImport(parsed, mapping, await existingRecords());

    const result = await commitImport(repo, validation, {
      campaignIds,
      includeIndexes,
      includeDuplicates,
      actorId: user.id,
    });

    revalidatePath('/', 'layout');
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Import failed.' };
  }
}
