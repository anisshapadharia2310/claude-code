/**
 * CSV import pipeline.
 *
 * Upload -> map columns -> validate -> normalize -> de-duplicate -> report ->
 * correct or skip -> commit -> score. Validation is pure and testable; only
 * commitImport touches the repository.
 */
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  createDedupeIndex, findDuplicate, type DedupeIndex, type DedupeRecord, type DuplicateMatch,
} from '@/domain/dedupe';
import { normalizeCountry, resolveCountry, timeZoneFor } from '@/domain/countries';
import {
  companyKey, employeeBandFromCount, inferSeniority, isFreeEmailDomain, isValidEmail,
  isValidPhone, normalizeDomain, normalizeEmail, normalizeJobTitle, normalizePersonName,
  normalizePhone, revenueBandFromValue,
} from '@/domain/normalize';
import { classifyRole } from '@/domain/taxonomy';
import { headerKey, parseCsv, type ParsedCsv } from '@/lib/csv';
import type { SignalRepository } from '../repo/types';
import { rescoreCampaign } from './scoring';

export type ImportField =
  | 'companyName' | 'firstName' | 'lastName' | 'jobTitle' | 'industry' | 'country'
  | 'workEmail' | 'phoneNumber' | 'city' | 'revenue' | 'employeeCount' | 'department'
  | 'linkedinUrl' | 'technology' | 'contactSource' | 'existingRelationship' | 'consentStatus'
  | 'domain' | 'subIndustry';

export interface FieldDefinition {
  field: ImportField;
  label: string;
  required: boolean;
  /** Header spellings accepted automatically during mapping. */
  aliases: string[];
  help: string;
}

export const IMPORT_FIELDS: FieldDefinition[] = [
  { field: 'companyName', label: 'Company name', required: true, aliases: ['company', 'companyname', 'account', 'accountname', 'organisation', 'organization', 'employer'], help: 'Used to group contacts into accounts.' },
  { field: 'firstName', label: 'Contact first name', required: true, aliases: ['firstname', 'first', 'givenname', 'forename'], help: '' },
  { field: 'lastName', label: 'Contact last name', required: true, aliases: ['lastname', 'last', 'surname', 'familyname'], help: '' },
  { field: 'jobTitle', label: 'Job title', required: true, aliases: ['title', 'jobtitle', 'position', 'role', 'designation'], help: 'Normalized before any classification. The raw value is kept.' },
  { field: 'industry', label: 'Industry', required: true, aliases: ['industry', 'sector', 'vertical'], help: '' },
  { field: 'country', label: 'Country', required: true, aliases: ['country', 'countryname', 'location', 'market'], help: 'Normalized to a canonical country name.' },
  { field: 'workEmail', label: 'Work email', required: false, aliases: ['email', 'workemail', 'emailaddress', 'businessemail'], help: 'Either a work email or a phone number is required.' },
  { field: 'phoneNumber', label: 'Phone number', required: false, aliases: ['phone', 'phonenumber', 'mobile', 'telephone', 'directdial', 'directline'], help: 'Either a work email or a phone number is required.' },
  { field: 'city', label: 'City', required: false, aliases: ['city', 'town', 'locality'], help: '' },
  { field: 'revenue', label: 'Revenue', required: false, aliases: ['revenue', 'annualrevenue', 'turnover', 'sales'], help: 'Accepts "$250M", "1.2bn" or a plain number.' },
  { field: 'employeeCount', label: 'Employee count', required: false, aliases: ['employees', 'employeecount', 'headcount', 'staff', 'size'], help: 'Mapped to an employee band.' },
  { field: 'department', label: 'Department', required: false, aliases: ['department', 'function', 'businessunit', 'team'], help: 'Materially improves role classification.' },
  { field: 'linkedinUrl', label: 'LinkedIn URL', required: false, aliases: ['linkedin', 'linkedinurl', 'linkedinprofile', 'profileurl'], help: '' },
  { field: 'technology', label: 'Technology', required: false, aliases: ['technology', 'tech', 'techstack', 'systems', 'software'], help: 'Semicolon or comma separated.' },
  { field: 'contactSource', label: 'Contact source', required: false, aliases: ['source', 'contactsource', 'leadsource', 'provenance'], help: 'Scores one data-quality point.' },
  { field: 'existingRelationship', label: 'Existing relationship', required: false, aliases: ['relationship', 'existingrelationship', 'clientstatus', 'accountstatus'], help: 'One of none, prospect, past client, current client, partner.' },
  { field: 'consentStatus', label: 'Consent status', required: false, aliases: ['consent', 'consentstatus', 'optin', 'permission', 'gdpr'], help: 'One of explicit opt in, soft opt in, legitimate interest, not captured, opt out, do not contact.' },
  { field: 'domain', label: 'Company domain', required: false, aliases: ['domain', 'website', 'companydomain', 'url', 'web'], help: 'Improves duplicate detection.' },
  { field: 'subIndustry', label: 'Sub-industry', required: false, aliases: ['subindustry', 'subsector', 'niche'], help: '' },
];

export type ColumnMapping = Partial<Record<ImportField, string>>;

/** Best-guess mapping from CSV headers to import fields. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const definition of IMPORT_FIELDS) {
    const match = headers.find((header) => {
      if (used.has(header)) return false;
      const key = headerKey(header);
      return key === headerKey(definition.label) || definition.aliases.includes(key);
    });
    if (match) {
      mapping[definition.field] = match;
      used.add(match);
    }
  }
  return mapping;
}

export interface NormalizedRow {
  companyName: string;
  domain: string | null;
  industry: string;
  subIndustry: string | null;
  country: string | null;
  city: string | null;
  timeZone: string | null;
  employeeBand: Prisma.AccountCreateManyInput['employeeBand'];
  revenueBand: Prisma.AccountCreateManyInput['revenueBand'];
  technology: string[];
  existingRelationship: Prisma.AccountCreateManyInput['existingClientRelationship'];
  firstName: string;
  lastName: string;
  jobTitle: string;
  normalizedJobTitle: string;
  department: string | null;
  seniority: ReturnType<typeof inferSeniority>;
  roleCategory: ReturnType<typeof classifyRole>['roleCategory'];
  roleConfidence: ReturnType<typeof classifyRole>['confidence'];
  roleExplanation: string;
  rejectedSignals: string[];
  workEmail: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  contactSource: string | null;
  consentStatus: Prisma.ContactCreateManyInput['consentStatus'];
}

export type RowStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export interface ImportRowResult {
  index: number;
  line: number;
  raw: Record<string, string>;
  normalized: NormalizedRow | null;
  errors: string[];
  warnings: string[];
  duplicate: DuplicateMatch | null;
  status: RowStatus;
}

export interface ImportValidationResult {
  headers: string[];
  mapping: ColumnMapping;
  rows: ImportRowResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    missingEmail: number;
    missingPhone: number;
    unknownCountries: string[];
    unverifiedRole: number;
  };
}

const RELATIONSHIP_MAP: Record<string, Prisma.AccountCreateManyInput['existingClientRelationship']> = {
  none: 'NONE', prospect: 'PROSPECT', pastclient: 'PAST_CLIENT', past: 'PAST_CLIENT',
  currentclient: 'CURRENT_CLIENT', current: 'CURRENT_CLIENT', client: 'CURRENT_CLIENT',
  customer: 'CURRENT_CLIENT', partner: 'PARTNER',
};

const CONSENT_MAP: Record<string, Prisma.ContactCreateManyInput['consentStatus']> = {
  explicitoptin: 'EXPLICIT_OPT_IN', optin: 'EXPLICIT_OPT_IN', yes: 'EXPLICIT_OPT_IN',
  softoptin: 'SOFT_OPT_IN', soft: 'SOFT_OPT_IN',
  legitimateinterest: 'LEGITIMATE_INTEREST', li: 'LEGITIMATE_INTEREST',
  notcaptured: 'NOT_CAPTURED', unknown: 'NOT_CAPTURED', '': 'NOT_CAPTURED',
  optout: 'OPT_OUT', unsubscribed: 'OPT_OUT', no: 'OPT_OUT',
  donotcontact: 'DO_NOT_CONTACT', dnc: 'DO_NOT_CONTACT',
};

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Validate and normalize every row.
 * Pure: give it a parsed file, a mapping and the records already on file.
 */
export function validateImport(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  existing: DedupeRecord[] = [],
): ImportValidationResult {
  const headerIndex = new Map(parsed.headers.map((header, index) => [header, index]));
  const index: DedupeIndex = createDedupeIndex(existing);
  const unknownCountries = new Set<string>();

  let valid = 0, invalid = 0, duplicates = 0, missingEmail = 0, missingPhone = 0, unverifiedRole = 0;

  const rows: ImportRowResult[] = parsed.rows.map((cells, rowIndex) => {
    const raw: Record<string, string> = {};
    parsed.headers.forEach((header, i) => { raw[header] = (cells[i] ?? '').trim(); });

    const get = (field: ImportField): string => {
      const header = mapping[field];
      if (!header) return '';
      const position = headerIndex.get(header);
      return position === undefined ? '' : (cells[position] ?? '').trim();
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    const companyName = get('companyName');
    const firstName = normalizePersonName(get('firstName'));
    const lastName = normalizePersonName(get('lastName'));
    const jobTitle = get('jobTitle');
    const industry = get('industry');
    const countryRaw = get('country');

    if (!companyName) errors.push('Company name is required.');
    if (!firstName) errors.push('Contact first name is required.');
    if (!lastName) errors.push('Contact last name is required.');
    if (!jobTitle) errors.push('Job title is required.');
    if (!industry) errors.push('Industry is required.');
    if (!countryRaw) errors.push('Country is required.');

    const countryInfo = resolveCountry(countryRaw);
    const country = normalizeCountry(countryRaw);
    if (countryRaw && !countryInfo) {
      warnings.push(`Country "${countryRaw}" was not recognised and could not be normalized. Time zone and compliance rules will be missing.`);
      unknownCountries.add(countryRaw);
    }

    const emailRaw = get('workEmail');
    const email = normalizeEmail(emailRaw);
    if (emailRaw && !isValidEmail(emailRaw)) errors.push(`"${emailRaw}" is not a valid email address.`);
    if (email && isValidEmail(email) && isFreeEmailDomain(email)) {
      warnings.push('Consumer email domain: this does not evidence employment at the company.');
    }

    const phoneRaw = get('phoneNumber');
    const phone = normalizePhone(phoneRaw, country);
    if (phoneRaw && !isValidPhone(phone)) errors.push(`"${phoneRaw}" is not a usable phone number.`);

    const hasEmail = Boolean(email) && isValidEmail(email);
    const hasPhone = Boolean(phone) && isValidPhone(phone);
    if (!hasEmail && !hasPhone) errors.push('A work email or a phone number is required.');
    if (!hasEmail) missingEmail += 1;
    if (!hasPhone) missingPhone += 1;

    const normalizedJobTitle = normalizeJobTitle(jobTitle);
    const seniority = inferSeniority(normalizedJobTitle);
    const department = get('department') || null;
    const classification = classifyRole({ normalizedJobTitle, department, seniority });

    if (classification.roleCategory === 'UNKNOWN' || classification.confidence === 'LOW' || classification.confidence === 'UNKNOWN') {
      unverifiedRole += 1;
      warnings.push(`Role could not be classified confidently: ${classification.explanation}`);
    }
    for (const rejected of classification.rejectedSignals) warnings.push(rejected);

    const employeeCount = Number.parseInt(get('employeeCount').replace(/[^\d]/g, ''), 10);
    const domain = normalizeDomain(get('domain')) ?? normalizeDomain(email);

    const candidate: DedupeRecord = {
      id: `row-${rowIndex}`,
      firstName, lastName,
      workEmail: email, phoneNumber: phone,
      companyName, domain, country,
    };
    const duplicate = findDuplicate(candidate, index);
    if (duplicate) duplicates += 1;

    const consentKey = get('consentStatus').toLowerCase().replace(/[^a-z]/g, '');
    const relationshipKey = get('existingRelationship').toLowerCase().replace(/[^a-z]/g, '');

    const normalized: NormalizedRow | null = errors.length > 0 ? null : {
      companyName,
      domain,
      industry,
      subIndustry: get('subIndustry') || null,
      country,
      city: get('city') || null,
      timeZone: timeZoneFor(country, get('city') || null),
      employeeBand: employeeBandFromCount(Number.isFinite(employeeCount) ? employeeCount : null),
      revenueBand: revenueBandFromValue(get('revenue')),
      technology: splitList(get('technology')),
      existingRelationship: RELATIONSHIP_MAP[relationshipKey] ?? 'NONE',
      firstName, lastName, jobTitle, normalizedJobTitle, department, seniority,
      roleCategory: classification.roleCategory,
      roleConfidence: classification.confidence,
      roleExplanation: classification.explanation,
      rejectedSignals: classification.rejectedSignals,
      workEmail: hasEmail ? email : null,
      phoneNumber: hasPhone ? phone : null,
      linkedinUrl: get('linkedinUrl') || null,
      contactSource: get('contactSource') || null,
      consentStatus: CONSENT_MAP[consentKey] ?? 'NOT_CAPTURED',
    };

    const status: RowStatus = errors.length > 0 ? 'INVALID' : duplicate ? 'DUPLICATE' : 'VALID';
    if (status === 'VALID') valid += 1;
    if (status === 'INVALID') invalid += 1;

    // Rows that will be written also join the dedupe index, so duplicates
    // inside the same file are caught, not just duplicates against the database.
    if (status === 'VALID') {
      index.byEmail.set(email ?? `row-${rowIndex}`, candidate.id);
      if (phone) index.byPhone.set(phone, candidate.id);
      const nameKey = `${firstName}|${lastName}`.toLowerCase();
      if (domain) index.byDomainName.set(`${domain}::${nameKey}`, candidate.id);
      const company = companyKey(companyName);
      if (company) index.byCompanyName.set(`${company}::${nameKey}`, candidate.id);
    }

    return {
      index: rowIndex,
      line: parsed.lineNumbers[rowIndex] ?? rowIndex + 2,
      raw, normalized, errors, warnings, duplicate, status,
    };
  });

  return {
    headers: parsed.headers,
    mapping,
    rows,
    summary: {
      total: rows.length, valid, invalid, duplicates, missingEmail, missingPhone,
      unknownCountries: [...unknownCountries], unverifiedRole,
    },
  };
}

export function validateCsvText(
  text: string,
  mapping: ColumnMapping | null,
  existing: DedupeRecord[] = [],
): ImportValidationResult {
  const parsed = parseCsv(text);
  return validateImport(parsed, mapping ?? suggestMapping(parsed.headers), existing);
}

export interface CommitOptions {
  campaignIds: string[];
  /** Row indexes the user chose to include. Defaults to every valid row. */
  includeIndexes?: number[];
  /** Include rows flagged as duplicates, marking them as duplicates. */
  includeDuplicates?: boolean;
  actorId?: string;
}

export interface CommitResult {
  accountsCreated: number;
  contactsCreated: number;
  membershipsCreated: number;
  skipped: number;
  campaignsScored: string[];
}

/** Writes accepted rows, then runs the scoring engine over the affected campaigns. */
export async function commitImport(
  repo: SignalRepository,
  validation: ImportValidationResult,
  options: CommitOptions,
): Promise<CommitResult> {
  const include = new Set(
    options.includeIndexes
    ?? validation.rows
      .filter((row) => row.status === 'VALID' || (options.includeDuplicates && row.status === 'DUPLICATE'))
      .map((row) => row.index),
  );

  const existingAccounts = await repo.listAccounts();
  const accountKey = (name: string, country: string | null): string => `${companyKey(name)}::${(country ?? '').toLowerCase()}`;
  const accountIds = new Map<string, string>(
    existingAccounts.map((account) => [accountKey(account.companyName, account.country), account.id]),
  );

  const newAccounts: Prisma.AccountCreateManyInput[] = [];
  const newContacts: Prisma.ContactCreateManyInput[] = [];
  const newCompliance: Prisma.ComplianceRecordCreateManyInput[] = [];
  const memberships: Array<{ campaignId: string; contactId: string }> = [];
  let skipped = 0;

  for (const row of validation.rows) {
    if (!include.has(row.index) || !row.normalized) { skipped += 1; continue; }
    const data = row.normalized;

    const key = accountKey(data.companyName, data.country);
    let accountId = accountIds.get(key);
    if (!accountId) {
      accountId = `acc-${randomUUID()}`;
      accountIds.set(key, accountId);
      newAccounts.push({
        id: accountId,
        companyName: data.companyName,
        domain: data.domain,
        industry: data.industry,
        subIndustry: data.subIndustry,
        country: data.country ?? 'Unknown',
        city: data.city,
        timeZone: data.timeZone,
        employeeBand: data.employeeBand,
        revenueBand: data.revenueBand,
        existingTechnology: data.technology,
        existingClientRelationship: data.existingRelationship,
        accountDataConfidence: 'MEDIUM',
        accountNotes: 'Created by CSV import.',
      });
    }

    const contactId = `ct-${randomUUID()}`;
    newContacts.push({
      id: contactId,
      accountId,
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.jobTitle,
      normalizedJobTitle: data.normalizedJobTitle,
      department: data.department,
      roleCategory: data.roleCategory,
      seniority: data.seniority,
      roleConfidence: data.roleConfidence,
      roleRelevanceNotes: data.roleExplanation,
      country: data.country ?? 'Unknown',
      city: data.city,
      timeZone: data.timeZone,
      workEmail: data.workEmail,
      emailStatus: data.workEmail ? 'UNVERIFIED' : 'MISSING',
      phoneNumber: data.phoneNumber,
      phoneStatus: data.phoneNumber ? 'UNVERIFIED' : 'MISSING',
      whatsappStatus: data.phoneNumber ? 'AVAILABLE_NO_CONSENT' : 'NOT_AVAILABLE',
      linkedinUrl: data.linkedinUrl,
      contactSource: data.contactSource,
      consentStatus: data.consentStatus,
      contactNotes: row.warnings.length > 0 ? `Import warnings: ${row.warnings.join(' ')}` : null,
      isDuplicate: row.status === 'DUPLICATE',
      duplicateOfId: row.duplicate?.existingId ?? null,
    });

    newCompliance.push({
      id: `cmp-${contactId}`,
      contactId,
      country: data.country ?? 'Unknown',
      consentStatus: data.consentStatus,
      consentSource: data.contactSource,
      lawfulBasis: data.consentStatus === 'EXPLICIT_OPT_IN' ? 'CONSENT' : 'NOT_DETERMINED',
      noticeProvided: false,
      optOutStatus: data.consentStatus === 'OPT_OUT' ? 'EMAIL_OPT_OUT'
        : data.consentStatus === 'DO_NOT_CONTACT' ? 'GLOBAL_OPT_OUT' : 'NONE',
      allowedChannels: [],
      blockedChannels: [],
      complianceNotes: 'Created by CSV import. Lawful basis must be confirmed before outreach.',
    });

    for (const campaignId of options.campaignIds) {
      memberships.push({ campaignId, contactId });
    }
  }

  const written = await repo.importRecords({
    accounts: newAccounts,
    contacts: newContacts,
    complianceRecords: newCompliance,
    memberships,
  });

  for (const campaignId of options.campaignIds) {
    await rescoreCampaign(repo, campaignId, {
      actorId: options.actorId,
      reason: 'IMPORT',
      detail: 'Scored on import.',
    });
  }

  return { ...written, skipped, campaignsScored: options.campaignIds };
}
