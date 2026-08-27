import { ConsentStatus, EmployeeBand, RevenueBand } from '@prisma/client';

/**
 * Country aliases seen in real target account lists. Normalising here means the
 * relevance gate can compare geography reliably instead of guessing.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  ca: 'Canada',
  can: 'Canada',
  canada: 'Canada',
  mx: 'Mexico',
  mex: 'Mexico',
  mexico: 'Mexico',
  'méxico': 'Mexico',
  fr: 'France',
  fra: 'France',
  france: 'France',
  co: 'Colombia',
  col: 'Colombia',
  colombia: 'Colombia',
  ae: 'United Arab Emirates',
  uae: 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  emirates: 'United Arab Emirates',
  sa: 'Saudi Arabia',
  ksa: 'Saudi Arabia',
  'saudi arabia': 'Saudi Arabia',
  saudi: 'Saudi Arabia',
  om: 'Oman',
  omn: 'Oman',
  oman: 'Oman',
  eg: 'Egypt',
  egy: 'Egypt',
  egypt: 'Egypt',
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'united states': 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  gb: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'great britain': 'United Kingdom',
  de: 'Germany',
  germany: 'Germany',
  es: 'Spain',
  spain: 'Spain',
};

/** Default IANA time zone per country, used when the row has none. */
export const COUNTRY_TIME_ZONES: Record<string, string> = {
  Canada: 'America/Toronto',
  Mexico: 'America/Mexico_City',
  France: 'Europe/Paris',
  Colombia: 'America/Bogota',
  'United Arab Emirates': 'Asia/Dubai',
  'Saudi Arabia': 'Asia/Riyadh',
  Oman: 'Asia/Muscat',
  Egypt: 'Africa/Cairo',
  'United States': 'America/New_York',
  'United Kingdom': 'Europe/London',
  Germany: 'Europe/Berlin',
  Spain: 'Europe/Madrid',
};

/** Default business language per country - a starting point, not a certainty. */
export const COUNTRY_LANGUAGES: Record<string, string> = {
  Canada: 'English',
  Mexico: 'Spanish',
  France: 'French',
  Colombia: 'Spanish',
  'United Arab Emirates': 'English',
  'Saudi Arabia': 'Arabic',
  Oman: 'Arabic',
  Egypt: 'Arabic',
  'United States': 'English',
  'United Kingdom': 'English',
  Germany: 'German',
  Spain: 'Spanish',
};

export const COUNTRY_REGIONS: Record<string, string> = {
  Canada: 'NAM',
  'United States': 'NAM',
  Mexico: 'LATAM',
  Colombia: 'LATAM',
  France: 'EMEA',
  'United Kingdom': 'EMEA',
  Germany: 'EMEA',
  Spain: 'EMEA',
  'United Arab Emirates': 'EMEA',
  'Saudi Arabia': 'EMEA',
  Oman: 'EMEA',
  Egypt: 'EMEA',
};

export interface CountryNormalization {
  country: string | null;
  matched: boolean;
  timeZone: string | null;
  language: string | null;
  region: string | null;
}

export function normalizeCountry(raw: string | null | undefined): CountryNormalization {
  const value = (raw ?? '').trim();
  if (!value) return { country: null, matched: false, timeZone: null, language: null, region: null };

  const key = value.toLowerCase().replace(/\s+/g, ' ');
  const canonical =
    COUNTRY_ALIASES[key] ??
    // Title-case fallback so unknown-but-plausible countries still import.
    value.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

  return {
    country: canonical,
    matched: !!COUNTRY_ALIASES[key],
    timeZone: COUNTRY_TIME_ZONES[canonical] ?? null,
    language: COUNTRY_LANGUAGES[canonical] ?? null,
    region: COUNTRY_REGIONS[canonical] ?? null,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@,;]+\.[a-z]{2,}$/i;
const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

export interface EmailNormalization {
  email: string | null;
  valid: boolean;
  isFreeProvider: boolean;
  domain: string | null;
}

export function normalizeEmail(raw: string | null | undefined): EmailNormalization {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return { email: null, valid: false, isFreeProvider: false, domain: null };
  const valid = EMAIL_PATTERN.test(value);
  const domain = valid ? value.split('@')[1] : null;
  return {
    email: value,
    valid,
    isFreeProvider: !!domain && FREE_EMAIL_DOMAINS.includes(domain),
    domain,
  };
}

/** Dial codes for the countries this agency operates in. */
const DIAL_CODES: Record<string, string> = {
  Canada: '1',
  'United States': '1',
  Mexico: '52',
  France: '33',
  Colombia: '57',
  'United Arab Emirates': '971',
  'Saudi Arabia': '966',
  Oman: '968',
  Egypt: '20',
  'United Kingdom': '44',
  Germany: '49',
  Spain: '34',
};

export interface PhoneNormalization {
  phone: string | null;
  valid: boolean;
  /** Digits only, used for duplicate matching. */
  comparable: string | null;
}

export function normalizePhone(
  raw: string | null | undefined,
  country?: string | null,
): PhoneNormalization {
  const value = (raw ?? '').trim();
  if (!value) return { phone: null, valid: false, comparable: null };

  const hadPlus = value.startsWith('+') || value.startsWith('00');
  let digits = value.replace(/\D/g, '');
  if (value.startsWith('00')) digits = digits.replace(/^00/, '');

  if (!hadPlus && country && DIAL_CODES[country]) {
    const code = DIAL_CODES[country];
    // Strip a national trunk prefix before prepending the country code.
    const national = digits.replace(/^0+/, '');
    if (!national.startsWith(code)) digits = `${code}${national}`;
    else digits = national;
  }

  // 8 digits (Oman) through 15 (E.164 maximum).
  const valid = digits.length >= 8 && digits.length <= 15;
  return {
    phone: valid ? `+${digits}` : value,
    valid,
    comparable: digits.length >= 7 ? digits.slice(-9) : null,
  };
}

/** Strips protocol/www so two spellings of one company collapse together. */
export function normalizeDomain(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim() || null;
}

/** Company name reduced to a comparison key ("Acme Corp." === "acme corporation"). */
export function normalizeCompanyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|plc|gmbh|sa|sas|sarl|bv|nv|co|company|group|holdings)\b/g,
      '',
    )
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizePersonName(first: string, last: string): string {
  return `${first} ${last}`.toLowerCase().replace(/[^a-z]/g, '');
}

export function employeeBandFromCount(raw: string | number | null | undefined): EmployeeBand {
  const count = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/[^\d]/g, ''));
  if (!Number.isFinite(count) || count <= 0) return EmployeeBand.UNKNOWN;
  if (count <= 50) return EmployeeBand.BAND_1_50;
  if (count <= 200) return EmployeeBand.BAND_51_200;
  if (count <= 500) return EmployeeBand.BAND_201_500;
  if (count <= 1000) return EmployeeBand.BAND_501_1000;
  if (count <= 5000) return EmployeeBand.BAND_1001_5000;
  if (count <= 10000) return EmployeeBand.BAND_5001_10000;
  return EmployeeBand.BAND_10001_PLUS;
}

/** Parses "$1.2B", "450m", "12,000,000" into a revenue band. */
export function revenueBandFromValue(raw: string | number | null | undefined): RevenueBand {
  if (raw === null || raw === undefined || raw === '') return RevenueBand.UNKNOWN;
  const text = String(raw).trim().toLowerCase();
  const numeric = Number(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return RevenueBand.UNKNOWN;

  // Unit suffixes attach directly to the digits ("$1.2b"), so match the end of
  // the string rather than relying on a word boundary.
  let value = numeric;
  if (/b(n|illion)?\.?\s*$/.test(text) || /billion/.test(text)) value = numeric * 1_000_000_000;
  else if (/m(m|illion)?\.?\s*$/.test(text) || /million/.test(text)) value = numeric * 1_000_000;
  else if (/k\.?\s*$/.test(text) || /thousand/.test(text)) value = numeric * 1_000;

  if (value < 10_000_000) return RevenueBand.LT_10M;
  if (value < 50_000_000) return RevenueBand.FROM_10M_50M;
  if (value < 250_000_000) return RevenueBand.FROM_50M_250M;
  if (value < 1_000_000_000) return RevenueBand.FROM_250M_1B;
  if (value < 5_000_000_000) return RevenueBand.FROM_1B_5B;
  return RevenueBand.GT_5B;
}

const CONSENT_ALIASES: Record<string, ConsentStatus> = {
  'opt in': ConsentStatus.EXPLICIT_OPT_IN,
  'opt-in': ConsentStatus.EXPLICIT_OPT_IN,
  optin: ConsentStatus.EXPLICIT_OPT_IN,
  'explicit opt in': ConsentStatus.EXPLICIT_OPT_IN,
  consented: ConsentStatus.EXPLICIT_OPT_IN,
  yes: ConsentStatus.EXPLICIT_OPT_IN,
  'soft opt in': ConsentStatus.SOFT_OPT_IN,
  soft: ConsentStatus.SOFT_OPT_IN,
  'legitimate interest': ConsentStatus.LEGITIMATE_INTEREST,
  li: ConsentStatus.LEGITIMATE_INTEREST,
  'opt out': ConsentStatus.OPT_OUT,
  'opt-out': ConsentStatus.OPT_OUT,
  unsubscribed: ConsentStatus.OPT_OUT,
  no: ConsentStatus.OPT_OUT,
  dnc: ConsentStatus.DO_NOT_CONTACT,
  'do not contact': ConsentStatus.DO_NOT_CONTACT,
  'do-not-contact': ConsentStatus.DO_NOT_CONTACT,
};

export function normalizeConsentStatus(raw: string | null | undefined): ConsentStatus {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return ConsentStatus.NOT_CAPTURED;
  if (value in CONSENT_ALIASES) return CONSENT_ALIASES[value];
  const upper = value.toUpperCase().replace(/[\s-]+/g, '_');
  if (upper in ConsentStatus) return upper as ConsentStatus;
  return ConsentStatus.NOT_CAPTURED;
}

/** Splits a delimited cell ("Salesforce; Genesys") into a clean list. */
export function splitList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[;,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
