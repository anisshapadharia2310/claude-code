/**
 * Import validation.
 *
 * Column mapping, required-value checks, normalization, and de-duplication
 * across all four keys - including duplicates that appear only inside the file
 * being imported.
 */
import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '@/lib/csv';
import { createDedupeIndex, findDuplicate } from '@/domain/dedupe';
import {
  employeeBandFromCount, normalizePhone, revenueBandFromValue,
} from '@/domain/normalize';
import { normalizeCountry, resolveCountry, timeZoneFor } from '@/domain/countries';
import { suggestMapping, validateCsvText } from '@/server/services/import';

const HEADER = 'Company Name,First Name,Last Name,Job Title,Industry,Country,Work Email,Phone,Department';

/** Quotes any field containing a comma or a quote, the way a real export does. */
const row = (values: string[]): string =>
  values.map((value) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)).join(',');

function csv(...rows: string[][]): string {
  return [HEADER, ...rows.map(row)].join('\n');
}

const good = [
  'Meridian Trust Bank', 'Elena', 'Marchetti', 'Director of Customer Experience',
  'Banking', 'Canada', 'elena.marchetti@meridiantrust.ca', '+14165550100', 'Customer Experience',
];

describe('CSV parsing', () => {
  it('reads a simple file', () => {
    const parsed = parseCsv(csv(good));
    expect(parsed.headers).toHaveLength(9);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]![0]).toBe('Meridian Trust Bank');
  });

  it('handles quoted fields containing commas, quotes and newlines', () => {
    const text = 'a,b\n"one, two","he said ""hi"""\n"multi\nline",x\n';
    const parsed = parseCsv(text);
    expect(parsed.rows[0]).toEqual(['one, two', 'he said "hi"']);
    expect(parsed.rows[1]![0]).toBe('multi\nline');
  });

  it('reports the source line of each row so errors can be traced', () => {
    const parsed = parseCsv(csv(good, good));
    expect(parsed.lineNumbers).toEqual([2, 3]);
  });

  it('skips blank lines without producing empty rows', () => {
    const parsed = parseCsv(`${HEADER}\n\n${row(good)}\n\n`);
    expect(parsed.rows).toHaveLength(1);
  });

  it('round-trips through the writer', () => {
    const text = toCsv(['a', 'b'], [['one, two', 'say "hi"']]);
    expect(parseCsv(text).rows[0]).toEqual(['one, two', 'say "hi"']);
  });
});

describe('column mapping', () => {
  it('proposes a mapping from common header spellings', () => {
    const mapping = suggestMapping([
      'Company', 'First Name', 'Surname', 'Position', 'Sector', 'Market', 'Email Address', 'Direct Dial',
    ]);
    expect(mapping.companyName).toBe('Company');
    expect(mapping.lastName).toBe('Surname');
    expect(mapping.jobTitle).toBe('Position');
    expect(mapping.industry).toBe('Sector');
    expect(mapping.country).toBe('Market');
    expect(mapping.workEmail).toBe('Email Address');
    expect(mapping.phoneNumber).toBe('Direct Dial');
  });

  it('leaves a field unmapped when nothing matches', () => {
    expect(suggestMapping(['Company', 'First Name']).jobTitle).toBeUndefined();
  });
});

describe('required values', () => {
  it('accepts a complete row', () => {
    const result = validateCsvText(csv(good), null);
    expect(result.summary.valid).toBe(1);
    expect(result.rows[0]!.errors).toHaveLength(0);
  });

  it('reports each missing required value separately', () => {
    const bad = ['', '', 'Nolastname', '', '', '', 'x@y.com', '', ''];
    const result = validateCsvText(csv(bad), null);
    const errors = result.rows[0]!.errors.join(' ');
    expect(errors).toContain('Company name is required');
    expect(errors).toContain('first name is required');
    expect(errors).toContain('Job title is required');
    expect(errors).toContain('Industry is required');
    expect(errors).toContain('Country is required');
    expect(result.rows[0]!.status).toBe('INVALID');
  });

  it('rejects a row with neither an email nor a phone number', () => {
    const noContact = [...good];
    noContact[6] = '';
    noContact[7] = '';
    const result = validateCsvText(csv(noContact), null);
    expect(result.rows[0]!.errors.join(' ')).toContain('work email or a phone number is required');
  });

  it('accepts a row with a phone number and no email', () => {
    const phoneOnly = [...good];
    phoneOnly[6] = '';
    const result = validateCsvText(csv(phoneOnly), null);
    expect(result.rows[0]!.status).toBe('VALID');
    expect(result.summary.missingEmail).toBe(1);
  });

  it('accepts a row with an email and no phone number', () => {
    const emailOnly = [...good];
    emailOnly[7] = '';
    const result = validateCsvText(csv(emailOnly), null);
    expect(result.rows[0]!.status).toBe('VALID');
    expect(result.summary.missingPhone).toBe(1);
  });

  it('rejects a malformed email address', () => {
    const badEmail = [...good];
    badEmail[6] = 'not-an-email';
    const result = validateCsvText(csv(badEmail), null);
    expect(result.rows[0]!.errors.join(' ')).toContain('not a valid email address');
  });

  it('warns about a consumer mailbox domain without rejecting the row', () => {
    const freeMail = [...good];
    freeMail[6] = 'elena.marchetti@gmail.com';
    const result = validateCsvText(csv(freeMail), null);
    expect(result.rows[0]!.status).toBe('VALID');
    expect(result.rows[0]!.warnings.join(' ')).toContain('Consumer email domain');
  });
});

describe('normalization', () => {
  it('normalizes every spelling of a country', () => {
    expect(normalizeCountry('UAE')).toBe('United Arab Emirates');
    expect(normalizeCountry('u.a.e.')).toBe('United Arab Emirates');
    expect(normalizeCountry('KSA')).toBe('Saudi Arabia');
    expect(normalizeCountry('MX')).toBe('Mexico');
    expect(normalizeCountry('méxico')).toBe('Mexico');
    expect(normalizeCountry('  canada ')).toBe('Canada');
  });

  it('resolves a country to a time zone and a calling code', () => {
    expect(resolveCountry('Oman')?.defaultTimeZone).toBe('Asia/Muscat');
    expect(resolveCountry('Egypt')?.callingCode).toBe('+20');
    expect(timeZoneFor('Canada', 'Calgary')).toBe('America/Edmonton');
  });

  it('flags a country it cannot resolve rather than guessing', () => {
    const unknown = [...good];
    unknown[5] = 'Atlantis';
    const result = validateCsvText(csv(unknown), null);
    expect(result.summary.unknownCountries).toContain('Atlantis');
    expect(result.rows[0]!.warnings.join(' ')).toContain('not recognised');
    expect(result.rows[0]!.status).toBe('VALID');
  });

  it('normalizes the job title and keeps the raw value', () => {
    const messy = [...good];
    messy[3] = 'Sr. Dir., Cust. Experience (EMEA)';
    const result = validateCsvText(csv(messy), null);
    expect(result.rows[0]!.normalized?.jobTitle).toBe('Sr. Dir., Cust. Experience (EMEA)');
    expect(result.rows[0]!.normalized?.normalizedJobTitle).toBe('senior director customer experience');
    expect(result.rows[0]!.normalized?.seniority).toBe('DIRECTOR');
  });

  it('normalizes phone numbers to a comparable form', () => {
    expect(normalizePhone('(416) 555-0100', 'Canada')).toBe('+14165550100');
    expect(normalizePhone('0044 20 7946 0000', 'United Kingdom')).toBe('+442079460000');
    expect(normalizePhone('05 55 12 34 56', 'France')).toBe('+33555123456');
  });

  it('maps employee counts and revenue strings to bands', () => {
    expect(employeeBandFromCount(7200)).toBe('BAND_5001_10000');
    expect(employeeBandFromCount(12)).toBe('BAND_1_50');
    expect(revenueBandFromValue('$2.4B')).toBe('USD_1B_5B');
    expect(revenueBandFromValue('1.9bn')).toBe('USD_1B_5B');
    expect(revenueBandFromValue('420M')).toBe('USD_250M_1B');
    expect(revenueBandFromValue('')).toBe('UNKNOWN');
  });

  it('classifies the role from the normalized title, and reports low confidence', () => {
    const trap = [...good];
    trap[3] = 'Customer Account Executive';
    trap[8] = 'Sales';
    const result = validateCsvText(csv(trap), null);
    expect(result.rows[0]!.normalized?.roleCategory).not.toBe('DIRECT_OWNER');
    expect(result.rows[0]!.warnings.join(' ')).toContain('revenue role');
  });
});

describe('duplicate detection', () => {
  const existing = [{
    id: 'ct-existing',
    firstName: 'Elena',
    lastName: 'Marchetti',
    workEmail: 'elena.marchetti@meridiantrust.ca',
    phoneNumber: '+14165550100',
    companyName: 'Meridian Trust Bank',
    domain: 'meridiantrust.ca',
    country: 'Canada',
  }];

  it('matches on work email', () => {
    const match = findDuplicate(
      { id: 'new', firstName: 'E', lastName: 'M', workEmail: 'elena.marchetti@meridiantrust.ca' },
      createDedupeIndex(existing),
    );
    expect(match?.matchType).toBe('EMAIL');
    expect(match?.confidence).toBe('HIGH');
  });

  it('matches on a phone number written differently', () => {
    const match = findDuplicate(
      { id: 'new', firstName: 'Someone', lastName: 'Else', phoneNumber: '(416) 555-0100', country: 'Canada' },
      createDedupeIndex(existing),
    );
    expect(match?.matchType).toBe('PHONE');
  });

  it('matches on company domain plus person name', () => {
    const match = findDuplicate(
      { id: 'new', firstName: 'Elena', lastName: 'Marchetti', domain: 'https://www.meridiantrust.ca/about' },
      createDedupeIndex(existing),
    );
    expect(match?.matchType).toBe('DOMAIN_AND_NAME');
  });

  it('matches on company name plus person name, ignoring legal suffixes', () => {
    const match = findDuplicate(
      { id: 'new', firstName: 'elena', lastName: 'MARCHETTI', companyName: 'Meridian Trust Bank Inc.' },
      createDedupeIndex(existing),
    );
    expect(match?.matchType).toBe('COMPANY_AND_NAME');
    expect(match?.confidence).toBe('MEDIUM');
  });

  it('does not match an unrelated person', () => {
    const match = findDuplicate(
      { id: 'new', firstName: 'Alan', lastName: 'Turing', workEmail: 'alan@example.com', companyName: 'Other Co' },
      createDedupeIndex(existing),
    );
    expect(match).toBeNull();
  });

  it('detects duplicates that appear only inside the imported file', () => {
    const second = [...good];
    second[7] = '';
    const result = validateCsvText(csv(good, second), null);
    expect(result.rows[0]!.status).toBe('VALID');
    expect(result.rows[1]!.status).toBe('DUPLICATE');
    expect(result.summary.duplicates).toBe(1);
  });

  it('flags a row that duplicates an existing contact', () => {
    const result = validateCsvText(csv(good), null, existing);
    expect(result.rows[0]!.status).toBe('DUPLICATE');
    expect(result.rows[0]!.duplicate?.existingId).toBe('ct-existing');
  });
});

describe('import summary', () => {
  it('counts every category the data-quality screen reports', () => {
    const invalid = ['', '', '', '', '', '', '', '', ''];
    const noPhone = [...good];
    noPhone[7] = '';
    const dup = [...good];

    const result = validateCsvText(csv(good, invalid, noPhone, dup), null);
    expect(result.summary.total).toBe(4);
    expect(result.summary.invalid).toBe(1);
    // Only the first row is new; the other two match it and are flagged, not counted valid.
    expect(result.summary.valid).toBe(1);
    expect(result.summary.duplicates).toBe(2);
  });
});
