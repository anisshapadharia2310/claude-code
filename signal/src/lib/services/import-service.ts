import {
  ConsentStatus,
  DataConfidence,
  DecisionRole,
  EmailStatus,
  ImportRowStatus,
  ImportStatus,
  PhoneStatus,
  Prisma,
  RoleCategory,
  ScoreChangeSource,
  WhatsAppStatus,
} from '@prisma/client';
import { prisma } from '../db';
import { classifyRoleCategory } from '../domain/role-taxonomy';
import { normalizeCompanyName, normalizePersonName, normalizePhone } from '../domain/import/normalize';
import { processRows, type ImportPreview, type ProcessedRow } from '../domain/import/process';
import type { ExistingContactKey } from '../domain/import/dedupe';
import type { CampaignInput } from '../domain/types';
import { enrollContacts } from './scoring-service';

/** Loads the comparison keys for every contact, for duplicate detection. */
export async function loadExistingContactKeys(): Promise<ExistingContactKey[]> {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      phoneNumber: true,
      account: { select: { companyName: true, domain: true } },
    },
  });

  return contacts.map((contact) => ({
    contactId: contact.id,
    email: contact.workEmail?.toLowerCase() ?? null,
    phoneComparable: normalizePhone(contact.phoneNumber).comparable,
    companyKey: normalizeCompanyName(contact.account.companyName),
    domain: contact.account.domain?.toLowerCase() ?? null,
    personKey: normalizePersonName(contact.firstName, contact.lastName),
  }));
}

export async function previewImport(
  records: Array<Record<string, string>>,
  mapping: Record<string, string | null>,
): Promise<ImportPreview> {
  return processRows(records, mapping, await loadExistingContactKeys());
}

export interface CommitImportInput {
  fileName: string;
  campaignId?: string | null;
  mapping: Record<string, string | null>;
  records: Array<Record<string, string>>;
  /** Row numbers the user chose to skip rather than correct. */
  skipRowNumbers?: number[];
  uploadedById: string;
}

export interface CommitImportSummary {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  skippedRows: number;
  importedRows: number;
  accountsCreated: number;
  accountsUpdated: number;
  contactsCreated: number;
  enrolledInCampaign: number;
  warnings: number;
}

/**
 * Writes an import batch to the database: accounts, contacts, compliance
 * records, then campaign enrolment and scoring. Invalid and duplicate rows are
 * preserved on the batch so the researcher can review what was rejected.
 */
export async function commitImport(input: CommitImportInput): Promise<CommitImportSummary> {
  const skip = new Set(input.skipRowNumbers ?? []);
  const preview = await previewImport(input.records, input.mapping);

  const campaign = input.campaignId
    ? await prisma.campaign.findUnique({ where: { id: input.campaignId } })
    : null;

  const batch = await prisma.importBatch.create({
    data: {
      fileName: input.fileName,
      campaignId: input.campaignId ?? null,
      uploadedById: input.uploadedById,
      status: ImportStatus.VALIDATED,
      columnMapping: input.mapping as Prisma.InputJsonValue,
      totalRows: preview.summary.totalRows,
      validRows: preview.summary.validRows,
      invalidRows: preview.summary.invalidRows,
      duplicateRows: preview.summary.duplicateRows,
    },
  });

  let accountsCreated = 0;
  let accountsUpdated = 0;
  let contactsCreated = 0;
  let skippedRows = 0;
  const importedContactIds: string[] = [];

  for (const row of preview.rows) {
    const shouldImport = row.status === 'VALID' && !skip.has(row.rowNumber);

    if (!shouldImport) {
      if (skip.has(row.rowNumber)) skippedRows += 1;
      await prisma.importRow.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw as Prisma.InputJsonValue,
          normalizedData: (row.normalized ?? undefined) as Prisma.InputJsonValue | undefined,
          status: skip.has(row.rowNumber)
            ? ImportRowStatus.SKIPPED
            : row.status === 'DUPLICATE'
              ? ImportRowStatus.DUPLICATE
              : ImportRowStatus.INVALID,
          errors: row.errors as unknown as Prisma.InputJsonValue,
          warnings: row.warnings as unknown as Prisma.InputJsonValue,
          duplicateOfContactId: row.duplicate.matchedContactId,
        },
      });
      continue;
    }

    const { contactId, createdAccount, updatedAccount } = await importOneRow(row, campaign);
    if (createdAccount) accountsCreated += 1;
    if (updatedAccount) accountsUpdated += 1;
    contactsCreated += 1;
    importedContactIds.push(contactId);

    await prisma.importRow.create({
      data: {
        batchId: batch.id,
        rowNumber: row.rowNumber,
        rawData: row.raw as Prisma.InputJsonValue,
        normalizedData: row.normalized as unknown as Prisma.InputJsonValue,
        status: ImportRowStatus.IMPORTED,
        warnings: row.warnings as unknown as Prisma.InputJsonValue,
        contactId,
      },
    });
  }

  let enrolledInCampaign = 0;
  if (input.campaignId && importedContactIds.length > 0) {
    const enrolment = await enrollContacts(input.campaignId, importedContactIds, {
      source: ScoreChangeSource.IMPORT,
      reason: `Imported from ${input.fileName}.`,
      changedById: input.uploadedById,
    });
    enrolledInCampaign = enrolment.enrolled;
  }

  const summary: CommitImportSummary = {
    batchId: batch.id,
    totalRows: preview.summary.totalRows,
    validRows: preview.summary.validRows,
    invalidRows: preview.summary.invalidRows,
    duplicateRows: preview.summary.duplicateRows,
    skippedRows,
    importedRows: contactsCreated,
    accountsCreated,
    accountsUpdated,
    contactsCreated,
    enrolledInCampaign,
    warnings: preview.rows.reduce((sum, row) => sum + row.warnings.length, 0),
  };

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: ImportStatus.COMMITTED,
      importedRows: contactsCreated,
      skippedRows,
      summary: summary as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });

  return summary;
}

/** Creates or updates the account, then creates the contact and its compliance record. */
async function importOneRow(
  row: ProcessedRow,
  campaign: { id: string; problemOwnershipTerms: string[]; targetJobFunctions: string[] } | null,
) {
  const data = row.normalized!;

  const existingAccount = await prisma.account.findFirst({
    where: {
      OR: [
        data.domain ? { domain: data.domain } : { id: '__never__' },
        { companyName: data.companyName, country: data.country },
      ],
    },
  });

  let accountId: string;
  let createdAccount = false;
  let updatedAccount = false;

  if (existingAccount) {
    accountId = existingAccount.id;
    // Only fill gaps - an import never overwrites researched account data.
    const patch: Prisma.AccountUpdateInput = {};
    if (!existingAccount.domain && data.domain) patch.domain = data.domain;
    if (!existingAccount.city && data.city) patch.city = data.city;
    if (existingAccount.employeeBand === 'UNKNOWN' && data.employeeBand !== 'UNKNOWN')
      patch.employeeBand = data.employeeBand;
    if (existingAccount.revenueBand === 'UNKNOWN' && data.revenueBand !== 'UNKNOWN')
      patch.revenueBand = data.revenueBand;
    if (data.technology.length && existingAccount.existingTechnology.length === 0)
      patch.existingTechnology = data.technology;
    if (Object.keys(patch).length > 0) {
      await prisma.account.update({ where: { id: accountId }, data: patch });
      updatedAccount = true;
    }
  } else {
    const account = await prisma.account.create({
      data: {
        companyName: data.companyName,
        domain: data.domain,
        industry: data.industry,
        subIndustry: data.subIndustry,
        country: data.country,
        city: data.city,
        region: data.region,
        timeZone: data.timeZone,
        language: data.language,
        employeeBand: data.employeeBand,
        revenueBand: data.revenueBand,
        existingTechnology: data.technology,
        existingClientRelationship: data.existingClientRelationship,
        // Imported accounts start unresearched: triggers are unknown until a
        // researcher verifies them, so no trigger points are awarded by default.
        accountDataConfidence: DataConfidence.LOW,
        accountNotes: `Created by CSV import on ${new Date().toISOString().slice(0, 10)}.`,
      },
    });
    accountId = account.id;
    createdAccount = true;
  }

  // Role classification runs against the campaign's definition of the problem.
  // Ownership flags stay false until a researcher confirms them, which is what
  // routes newly imported contacts into the review queue.
  const classification = campaign
    ? classifyRoleCategory(
        {
          normalizedJobTitle: data.normalizedJobTitle,
          department: data.department,
          jobFunction: data.department,
          seniority: data.seniority,
          decisionRole: DecisionRole.UNKNOWN,
          ownsBudget: false,
          influencesDecision: false,
          directProblemResponsibility: false,
        },
        campaign as unknown as CampaignInput,
      )
    : { category: RoleCategory.UNKNOWN, confidence: DataConfidence.UNVERIFIED, signals: [], rejectedSignals: [], ownershipEvidenceCount: 0 };

  const contact = await prisma.contact.create({
    data: {
      accountId,
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.jobTitle,
      normalizedJobTitle: data.normalizedJobTitle,
      department: data.department,
      jobFunction: data.department,
      roleCategory: classification.category,
      seniority: data.seniority,
      decisionRole: DecisionRole.UNKNOWN,
      roleConfidence: classification.confidence,
      roleRelevanceNotes: [...classification.signals, ...classification.rejectedSignals].join(' '),
      country: data.country,
      city: data.city,
      timeZone: data.timeZone,
      language: data.language,
      workEmail: data.workEmail,
      emailStatus: data.workEmail ? EmailStatus.UNVERIFIED : EmailStatus.MISSING,
      emailConfidence: DataConfidence.UNVERIFIED,
      phoneNumber: data.phoneNumber,
      phoneStatus: data.phoneNumber ? PhoneStatus.UNVERIFIED : PhoneStatus.MISSING,
      whatsappStatus: WhatsAppStatus.UNKNOWN,
      linkedinUrl: data.linkedinUrl,
      contactSource: data.contactSource ?? 'CSV import',
      consentStatus: data.consentStatus,
      contactNotes: `Imported ${new Date().toISOString().slice(0, 10)}. Role and triggers require research verification.`,
    },
  });

  await prisma.complianceRecord.create({
    data: {
      contactId: contact.id,
      country: data.country,
      consentStatus: data.consentStatus,
      consentSource: data.consentStatus === ConsentStatus.NOT_CAPTURED ? null : data.contactSource,
      complianceNotes: 'Created by import. Requires review before outreach.',
    },
  });

  return { contactId: contact.id, createdAccount, updatedAccount };
}
