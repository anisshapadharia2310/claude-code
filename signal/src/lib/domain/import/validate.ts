import { z } from 'zod';
import { ClientRelationship, ConsentStatus, EmployeeBand, RevenueBand } from '@prisma/client';
import { detectSeniority, normalizeJobTitle } from '../role-taxonomy';
import {
  employeeBandFromCount,
  normalizeCompanyName,
  normalizeConsentStatus,
  normalizeCountry,
  normalizeDomain,
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  revenueBandFromValue,
  splitList,
} from './normalize';

/** The raw shape after column mapping is applied: canonical key -> cell value. */
export type MappedRow = Record<string, string | undefined>;

export interface RowIssue {
  field: string;
  message: string;
}

export interface NormalizedRow {
  companyName: string;
  companyKey: string;
  domain: string | null;
  industry: string;
  subIndustry: string | null;
  country: string;
  city: string | null;
  timeZone: string | null;
  language: string | null;
  region: string | null;
  employeeBand: EmployeeBand;
  revenueBand: RevenueBand;
  technology: string[];
  existingClientRelationship: ClientRelationship;

  firstName: string;
  lastName: string;
  personKey: string;
  jobTitle: string;
  normalizedJobTitle: string;
  seniority: ReturnType<typeof detectSeniority>;
  department: string | null;
  linkedinUrl: string | null;
  workEmail: string | null;
  emailDomain: string | null;
  phoneNumber: string | null;
  phoneComparable: string | null;
  contactSource: string | null;
  consentStatus: ConsentStatus;
}

export interface RowValidationResult {
  valid: boolean;
  errors: RowIssue[];
  warnings: RowIssue[];
  normalized: NormalizedRow | null;
}

const requiredText = (field: string, label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`);

/** Schema for the mandatory columns. Optional columns are normalised leniently. */
export const importRowSchema = z.object({
  companyName: requiredText('companyName', 'Company name'),
  firstName: requiredText('firstName', 'Contact first name'),
  lastName: requiredText('lastName', 'Contact last name'),
  jobTitle: requiredText('jobTitle', 'Job title'),
  industry: requiredText('industry', 'Industry'),
  country: requiredText('country', 'Country'),
  workEmail: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
});

const RELATIONSHIP_ALIASES: Record<string, ClientRelationship> = {
  'current client': ClientRelationship.CURRENT_CLIENT,
  client: ClientRelationship.CURRENT_CLIENT,
  customer: ClientRelationship.CURRENT_CLIENT,
  'past client': ClientRelationship.PAST_CLIENT,
  former: ClientRelationship.PAST_CLIENT,
  'former client': ClientRelationship.PAST_CLIENT,
  partner: ClientRelationship.PARTNER,
  prospect: ClientRelationship.PROSPECT_IN_PIPELINE,
  'in pipeline': ClientRelationship.PROSPECT_IN_PIPELINE,
  none: ClientRelationship.NONE,
  '': ClientRelationship.NONE,
};

function normalizeRelationship(raw: string | undefined): ClientRelationship {
  const value = (raw ?? '').trim().toLowerCase();
  if (value in RELATIONSHIP_ALIASES) return RELATIONSHIP_ALIASES[value];
  const upper = value.toUpperCase().replace(/\s+/g, '_');
  if (upper in ClientRelationship) return upper as ClientRelationship;
  return ClientRelationship.NONE;
}

/**
 * Validates and normalises one mapped CSV row.
 *
 * Errors block the row from importing; warnings let it through but are surfaced
 * so a researcher can fix the record later.
 */
export function validateRow(row: MappedRow): RowValidationResult {
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];

  const parsed = importRowSchema.safeParse(row);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ field: String(issue.path[0] ?? 'row'), message: issue.message });
    }
  }

  const country = normalizeCountry(row.country);
  if (row.country && !country.matched) {
    warnings.push({
      field: 'country',
      message: `Country "${row.country}" was not recognised; imported as "${country.country}". Confirm before targeting.`,
    });
  }

  const email = normalizeEmail(row.workEmail);
  if (row.workEmail && !email.valid) {
    errors.push({ field: 'workEmail', message: `"${row.workEmail}" is not a valid email address.` });
  }
  if (email.valid && email.isFreeProvider) {
    warnings.push({
      field: 'workEmail',
      message: 'Personal email provider - this is not a verified work address.',
    });
  }

  const phone = normalizePhone(row.phoneNumber, country.country);
  if (row.phoneNumber && !phone.valid) {
    errors.push({
      field: 'phoneNumber',
      message: `"${row.phoneNumber}" is not a usable phone number.`,
    });
  }

  // Reachability: the brief requires an email OR a phone number.
  const hasEmail = !!email.email && email.valid;
  const hasPhone = !!row.phoneNumber && phone.valid;
  if (!hasEmail && !hasPhone) {
    errors.push({
      field: 'reachability',
      message: 'A work email or a phone number is required - the contact must be reachable.',
    });
  }
  if (hasPhone && !hasEmail) {
    warnings.push({
      field: 'workEmail',
      message: 'No email address - email qualification and nurture will not be available.',
    });
  }
  if (hasEmail && !hasPhone) {
    warnings.push({
      field: 'phoneNumber',
      message: 'No phone number - this contact will be qualified and nurtured by email.',
    });
  }

  const consentStatus = normalizeConsentStatus(row.consentStatus);
  if (row.consentStatus && consentStatus === ConsentStatus.NOT_CAPTURED) {
    warnings.push({
      field: 'consentStatus',
      message: `Consent value "${row.consentStatus}" was not recognised; recorded as not captured.`,
    });
  }
  if (!row.consentStatus) {
    warnings.push({
      field: 'consentStatus',
      message: 'No consent status supplied - the contact will be placed on compliance hold.',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, normalized: null };
  }

  const data = parsed.success ? parsed.data : null;
  if (!data || !country.country) {
    return { valid: false, errors, warnings, normalized: null };
  }

  const normalizedJobTitle = normalizeJobTitle(data.jobTitle);
  const domain = normalizeDomain(row.domain) ?? email.domain;

  return {
    valid: true,
    errors,
    warnings,
    normalized: {
      companyName: data.companyName,
      companyKey: normalizeCompanyName(data.companyName),
      domain,
      industry: data.industry,
      subIndustry: row.subIndustry?.trim() || null,
      country: country.country,
      city: row.city?.trim() || null,
      timeZone: country.timeZone,
      language: country.language,
      region: country.region,
      employeeBand: employeeBandFromCount(row.employeeCount),
      revenueBand: revenueBandFromValue(row.revenue),
      technology: splitList(row.technology),
      existingClientRelationship: normalizeRelationship(row.existingRelationship),

      firstName: data.firstName,
      lastName: data.lastName,
      personKey: normalizePersonName(data.firstName, data.lastName),
      jobTitle: data.jobTitle,
      normalizedJobTitle,
      seniority: detectSeniority(normalizedJobTitle),
      department: row.department?.trim() || null,
      linkedinUrl: row.linkedinUrl?.trim() || null,
      workEmail: hasEmail ? email.email : null,
      emailDomain: email.domain,
      phoneNumber: hasPhone ? phone.phone : null,
      phoneComparable: hasPhone ? phone.comparable : null,
      contactSource: row.contactSource?.trim() || null,
      consentStatus,
    },
  };
}

/** Applies a confirmed column mapping to a raw parsed CSV record. */
export function applyMapping(
  raw: Record<string, string>,
  mapping: Record<string, string | null>,
): MappedRow {
  const mapped: MappedRow = {};
  for (const [header, key] of Object.entries(mapping)) {
    if (!key) continue;
    const value = raw[header];
    if (value !== undefined && String(value).trim() !== '') mapped[key] = String(value).trim();
  }
  return mapped;
}
