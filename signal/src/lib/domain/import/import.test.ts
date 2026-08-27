import { describe, expect, it } from 'vitest';
import { ClientRelationship, ConsentStatus, EmployeeBand, RevenueBand } from '@prisma/client';
import {
  employeeBandFromCount,
  normalizeCompanyName,
  normalizeConsentStatus,
  normalizeCountry,
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  revenueBandFromValue,
  splitList,
} from './normalize';
import { proposeMapping, REQUIRED_COLUMN_KEYS } from './columns';
import { applyMapping, validateRow } from './validate';
import { findDuplicate, type ExistingContactKey } from './dedupe';
import { processRows } from './process';

const baseRow = {
  companyName: 'Northwind Utilities Inc.',
  firstName: 'Amara',
  lastName: 'Osei',
  jobTitle: 'Head of Customer Experience',
  industry: 'Utilities',
  country: 'CA',
  workEmail: 'amara.osei@northwind.example',
  consentStatus: 'legitimate interest',
};

describe('country normalization', () => {
  it.each([
    ['CA', 'Canada'],
    ['canada', 'Canada'],
    ['MX', 'Mexico'],
    ['UAE', 'United Arab Emirates'],
    ['KSA', 'Saudi Arabia'],
    ['ksa', 'Saudi Arabia'],
    ['EG', 'Egypt'],
    ['om', 'Oman'],
    ['colombia', 'Colombia'],
  ])('normalizes "%s" to %s', (input, expected) => {
    const result = normalizeCountry(input);
    expect(result.country).toBe(expected);
    expect(result.matched).toBe(true);
  });

  it('infers time zone, language and region', () => {
    const result = normalizeCountry('Saudi Arabia');
    expect(result.timeZone).toBe('Asia/Riyadh');
    expect(result.language).toBe('Arabic');
    expect(result.region).toBe('EMEA');
  });

  it('title-cases an unrecognised country and flags it as unmatched', () => {
    const result = normalizeCountry('freedonia');
    expect(result.country).toBe('Freedonia');
    expect(result.matched).toBe(false);
    expect(result.timeZone).toBeNull();
  });
});

describe('field normalization', () => {
  it('validates email addresses and detects free providers', () => {
    expect(normalizeEmail('A.Person@Example.COM').email).toBe('a.person@example.com');
    expect(normalizeEmail('A.Person@Example.com').valid).toBe(true);
    expect(normalizeEmail('not-an-email').valid).toBe(false);
    expect(normalizeEmail('someone@gmail.com').isFreeProvider).toBe(true);
  });

  it('converts national phone numbers to E.164 using the country', () => {
    expect(normalizePhone('(416) 555-0123', 'Canada').phone).toBe('+14165550123');
    expect(normalizePhone('05 12 34 56 78', 'France').phone).toBe('+33512345678');
    expect(normalizePhone('+968 9123 4567', 'Oman').phone).toBe('+96891234567');
  });

  it('rejects a phone number that is too short to dial', () => {
    expect(normalizePhone('12345', 'Canada').valid).toBe(false);
  });

  it('matches phone numbers on the last nine digits, ignoring formatting', () => {
    expect(normalizePhone('+1 416 555 0123').comparable).toBe(
      normalizePhone('(416) 555-0123', 'Canada').comparable,
    );
  });

  it('collapses company name variants to one comparison key', () => {
    expect(normalizeCompanyName('Acme Corp.')).toBe(normalizeCompanyName('ACME Corporation'));
    expect(normalizeCompanyName('Northwind Utilities Inc.')).toBe(
      normalizeCompanyName('northwind utilities'),
    );
  });

  it('strips protocol and www from domains', () => {
    expect(normalizeDomain('https://www.Northwind.example/careers')).toBe('northwind.example');
  });

  it('derives employee and revenue bands', () => {
    expect(employeeBandFromCount('7,500')).toBe(EmployeeBand.BAND_5001_10000);
    expect(employeeBandFromCount(42)).toBe(EmployeeBand.BAND_1_50);
    expect(employeeBandFromCount('')).toBe(EmployeeBand.UNKNOWN);
    expect(revenueBandFromValue('$1.2B')).toBe(RevenueBand.FROM_1B_5B);
    expect(revenueBandFromValue('450m')).toBe(RevenueBand.FROM_250M_1B);
    expect(revenueBandFromValue('not a number')).toBe(RevenueBand.UNKNOWN);
  });

  it('maps consent spellings onto the consent enum', () => {
    expect(normalizeConsentStatus('opt-in')).toBe(ConsentStatus.EXPLICIT_OPT_IN);
    expect(normalizeConsentStatus('Do Not Contact')).toBe(ConsentStatus.DO_NOT_CONTACT);
    expect(normalizeConsentStatus('legitimate interest')).toBe(ConsentStatus.LEGITIMATE_INTEREST);
    expect(normalizeConsentStatus('')).toBe(ConsentStatus.NOT_CAPTURED);
  });

  it('splits delimited list cells', () => {
    expect(splitList('Salesforce; Genesys , Twilio')).toEqual(['Salesforce', 'Genesys', 'Twilio']);
  });
});

describe('column mapping', () => {
  it('maps common header spellings to canonical columns', () => {
    const { mapping, unmappedRequired, missingReachability } = proposeMapping([
      'Company Name',
      'First Name',
      'Surname',
      'Position',
      'Sector',
      'Country',
      'E-Mail',
      'Direct Dial',
    ]);
    expect(mapping['Surname']).toBe('lastName');
    expect(mapping['Position']).toBe('jobTitle');
    expect(mapping['Sector']).toBe('industry');
    expect(mapping['E-Mail']).toBe('workEmail');
    expect(mapping['Direct Dial']).toBe('phoneNumber');
    expect(unmappedRequired).toEqual([]);
    expect(missingReachability).toBe(false);
  });

  it('reports required columns that could not be mapped', () => {
    const { unmappedRequired, missingReachability } = proposeMapping(['Company', 'Full Name']);
    expect(unmappedRequired).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'jobTitle', 'industry', 'country']),
    );
    expect(missingReachability).toBe(true);
  });

  it('leaves unknown headers unmapped rather than guessing', () => {
    const { mapping } = proposeMapping(['Internal Ref Code']);
    expect(mapping['Internal Ref Code']).toBeNull();
  });

  it('knows the six mandatory columns', () => {
    expect(REQUIRED_COLUMN_KEYS).toEqual([
      'companyName',
      'firstName',
      'lastName',
      'jobTitle',
      'industry',
      'country',
    ]);
  });

  it('applies a mapping and drops empty cells', () => {
    const mapped = applyMapping(
      { Company: 'Acme', 'First Name': 'Sam', City: '   ' },
      { Company: 'companyName', 'First Name': 'firstName', City: 'city' },
    );
    expect(mapped).toEqual({ companyName: 'Acme', firstName: 'Sam' });
  });
});

describe('row validation', () => {
  it('accepts and normalizes a complete row', () => {
    const result = validateRow(baseRow);
    expect(result.valid).toBe(true);
    expect(result.normalized).toMatchObject({
      country: 'Canada',
      timeZone: 'America/Toronto',
      normalizedJobTitle: 'head of customer experience',
      companyKey: normalizeCompanyName('Northwind Utilities Inc.'),
      consentStatus: ConsentStatus.LEGITIMATE_INTEREST,
    });
    // A domain is inferred from the email address when none is supplied.
    expect(result.normalized?.domain).toBe('northwind.example');
  });

  it.each(REQUIRED_COLUMN_KEYS)('rejects a row missing %s', (field) => {
    const row = { ...baseRow, [field]: '' };
    const result = validateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === field)).toBe(true);
  });

  it('rejects a row with neither an email nor a phone number', () => {
    const { workEmail, ...withoutEmail } = baseRow;
    const result = validateRow(withoutEmail);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'reachability')).toBe(true);
  });

  it('accepts a phone-only row and warns that email nurture is unavailable', () => {
    const { workEmail, ...row } = baseRow;
    const result = validateRow({ ...row, phoneNumber: '+1 416 555 0199' });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => /No email address/.test(w.message))).toBe(true);
  });

  it('accepts an email-only row and warns that it will be nurtured by email', () => {
    const result = validateRow(baseRow);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => /nurtured by email/.test(w.message))).toBe(true);
  });

  it('rejects a malformed email address', () => {
    const result = validateRow({ ...baseRow, workEmail: 'amara.osei[at]northwind' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/not a valid email/);
  });

  it('rejects an unusable phone number', () => {
    const result = validateRow({ ...baseRow, phoneNumber: '123' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'phoneNumber')).toBe(true);
  });

  it('warns rather than fails on an unrecognised country', () => {
    const result = validateRow({ ...baseRow, country: 'Freedonia' });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.field === 'country')).toBe(true);
  });

  it('warns when no consent status is supplied', () => {
    const { consentStatus, ...row } = baseRow;
    const result = validateRow(row);
    expect(result.warnings.some((w) => /compliance hold/.test(w.message))).toBe(true);
  });

  it('parses the optional enrichment columns', () => {
    const result = validateRow({
      ...baseRow,
      employeeCount: '7500',
      revenue: '$1.2B',
      technology: 'Salesforce; Genesys',
      existingRelationship: 'current client',
      department: 'Customer Experience',
    });
    expect(result.normalized).toMatchObject({
      employeeBand: EmployeeBand.BAND_5001_10000,
      revenueBand: RevenueBand.FROM_1B_5B,
      technology: ['Salesforce', 'Genesys'],
      existingClientRelationship: ClientRelationship.CURRENT_CLIENT,
      department: 'Customer Experience',
    });
  });
});

describe('duplicate detection', () => {
  const normalized = validateRow(baseRow).normalized!;
  const existing = (overrides: Partial<ExistingContactKey>): ExistingContactKey[] => [
    {
      contactId: 'con_existing',
      email: null,
      phoneComparable: null,
      companyKey: 'other',
      domain: null,
      personKey: 'someoneelse',
      ...overrides,
    },
  ];

  it('finds no duplicate against an unrelated database', () => {
    expect(findDuplicate(normalized, existing({})).isDuplicate).toBe(false);
  });

  it('matches on email', () => {
    const match = findDuplicate(normalized, existing({ email: 'amara.osei@northwind.example' }));
    expect(match.reason).toBe('EMAIL');
    expect(match.matchedContactId).toBe('con_existing');
  });

  it('matches on phone number', () => {
    const phoneRow = validateRow({ ...baseRow, phoneNumber: '+1 416 555 0123' }).normalized!;
    const match = findDuplicate(phoneRow, existing({ phoneComparable: '165550123' }));
    expect(match.reason).toBe('PHONE');
  });

  it('matches on company domain plus person name', () => {
    const match = findDuplicate(
      normalized,
      existing({ domain: 'northwind.example', personKey: 'amaraosei' }),
    );
    expect(match.reason).toBe('DOMAIN_AND_NAME');
  });

  it('matches on company name plus person name when there is no domain', () => {
    const match = findDuplicate(
      normalized,
      existing({ companyKey: normalized.companyKey, personKey: 'amaraosei' }),
    );
    expect(match.reason).toBe('COMPANY_AND_NAME');
  });

  it('catches a duplicate appearing twice within the same file', () => {
    const match = findDuplicate(normalized, [], [{ rowNumber: 2, row: normalized }]);
    expect(match.reason).toBe('WITHIN_FILE');
    expect(match.matchedRowNumber).toBe(2);
  });
});

describe('end-to-end import preview', () => {
  const headers = {
    Company: 'companyName',
    First: 'firstName',
    Last: 'lastName',
    Title: 'jobTitle',
    Sector: 'industry',
    Country: 'country',
    Email: 'workEmail',
  };

  const records = [
    { Company: 'Northwind Utilities', First: 'Amara', Last: 'Osei', Title: 'Head of Customer Experience', Sector: 'Utilities', Country: 'CA', Email: 'amara.osei@northwind.example' },
    { Company: 'Northwind Utilities', First: 'Amara', Last: 'Osei', Title: 'Head of CX', Sector: 'Utilities', Country: 'Canada', Email: 'amara.osei@northwind.example' },
    { Company: 'Beacon Bank', First: 'Luc', Last: 'Bernard', Title: 'Directeur Service Client', Sector: 'Banking', Country: 'FR', Email: 'not-an-email' },
    { Company: '', First: 'No', Last: 'Company', Title: 'Manager', Sector: 'Retail', Country: 'MX', Email: 'no.company@example.com' },
    { Company: 'Gulf Energy', First: 'Fatima', Last: 'Al Balushi', Title: 'Customer Operations Director', Sector: 'Energy', Country: 'OM', Email: 'fatima@gulfenergy.example' },
  ];

  it('classifies every row and produces an accurate summary', () => {
    const preview = processRows(records, headers);
    expect(preview.summary).toMatchObject({
      totalRows: 5,
      validRows: 2,
      invalidRows: 2,
      duplicateRows: 1,
    });
    expect(preview.rows[1].status).toBe('DUPLICATE');
    expect(preview.rows[1].duplicate.detail).toMatch(/row 2/);
    expect(preview.rows[2].status).toBe('INVALID');
    expect(preview.rows[3].status).toBe('INVALID');
  });

  it('reports data-quality counts the researcher has to act on', () => {
    const preview = processRows(records, headers);
    expect(preview.summary.missingPhone).toBe(2);
    expect(preview.summary.missingConsent).toBe(2);
  });

  it('re-runs cleanly after a row is corrected', () => {
    const corrected = [...records];
    corrected[2] = { ...corrected[2], Email: 'luc.bernard@beaconbank.example' };
    const preview = processRows(corrected, headers);
    expect(preview.summary.validRows).toBe(3);
    expect(preview.summary.invalidRows).toBe(1);
  });
});
