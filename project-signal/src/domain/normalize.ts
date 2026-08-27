/**
 * Normalization helpers.
 *
 * The whole premise of SIGNAL is that a raw job title is evidence, not an
 * answer. Normalization turns "Sr. Dir., Cust. Experience (EMEA)" into
 * "senior director customer experience" so that classification works on a
 * stable string, and so that a human reviewing the record sees what the
 * machine actually read.
 */
import { resolveCountry } from './countries';
import type { EmployeeBand, RevenueBand, Seniority } from './types';

/** Abbreviations expanded before any matching happens. */
const TITLE_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bceo\b/g, 'chief executive officer'],
  [/\bcoo\b/g, 'chief operating officer'],
  [/\bcfo\b/g, 'chief financial officer'],
  [/\bcio\b/g, 'chief information officer'],
  [/\bcto\b/g, 'chief technology officer'],
  [/\bcdo\b/g, 'chief digital officer'],
  [/\bcmo\b/g, 'chief marketing officer'],
  [/\bcco\b/g, 'chief customer officer'],
  [/\bcxo\b/g, 'chief experience officer'],
  [/\bchro\b/g, 'chief human resources officer'],
  [/\bciso\b/g, 'chief information security officer'],
  [/\bevp\b/g, 'executive vice president'],
  [/\bsvp\b/g, 'senior vice president'],
  [/\bavp\b/g, 'associate vice president'],
  [/\bvp\b/g, 'vice president'],
  [/\bv\.?p\.?\b/g, 'vice president'],
  [/\bsr\.?\b/g, 'senior'],
  [/\bjr\.?\b/g, 'junior'],
  [/\bdir\.?\b/g, 'director'],
  [/\bmgr\.?\b/g, 'manager'],
  [/\bmgmt\.?\b/g, 'management'],
  [/\bassoc\.?\b/g, 'associate'],
  [/\basst\.?\b/g, 'assistant'],
  [/\bgm\b/g, 'general manager'],
  [/\bcust\.?\b/g, 'customer'],
  [/\bsvc\.?\b/g, 'service'],
  [/\bcx\b/g, 'customer experience'],
  [/\bcs\b/g, 'customer service'],
  [/\bcsm\b/g, 'customer success manager'],
  [/\bcrm\b/g, 'customer relationship management'],
  [/\bops\b/g, 'operations'],
  [/\bit\b/g, 'information technology'],
  [/\bhr\b/g, 'human resources'],
  [/\bbi\b/g, 'business intelligence'],
  [/\bqa\b/g, 'quality assurance'],
  [/\br&d\b/g, 'research and development'],
  [/\bp&l\b/g, 'profit and loss'],
  [/\bhse\b/g, 'health safety and environment'],
  [/\bo&m\b/g, 'operations and maintenance'],
  [/\bscada\b/g, 'supervisory control and data acquisition'],
  [/\bbpo\b/g, 'business process outsourcing'],
  [/\bnps\b/g, 'net promoter score'],
  [/\bpmo\b/g, 'project management office'],
  // Titles arrive in the market's own language. Normalising the seniority word
  // is enough: the function terms themselves are matched in-language.
  [/\bdirectrice\b|\bdirecteur\b|\bdirectora\b/g, 'director'],
  [/\bvicepresidente\b|\bvicepresidenta\b|\bvice-président\b|\bvice-presidente\b/g, 'vice president'],
  [/\bresponsable\b/g, 'head of'],
  [/\bjefe\b|\bjefa\b/g, 'head of'],
  [/\bgerente\b/g, 'manager'],
  [/\bencargado\b|\bencargada\b/g, 'manager'],
  [/\bchef de\b/g, 'head of'],
  [/\bsubdirector\b/g, 'deputy director'],
];

/** Region and noise suffixes that carry no role information. */
const TITLE_NOISE = [
  'emea', 'apac', 'latam', 'anz', 'mena', 'gcc', 'na', 'north america',
  'latin america', 'middle east', 'asia pacific', 'global', 'worldwide',
  'international', 'group', 'corporate', 'regional', 'country',
];

/**
 * Produce the canonical form of a job title.
 * Lowercases, drops parentheticals and punctuation, expands abbreviations,
 * strips region noise and collapses whitespace.
 */
export function normalizeJobTitle(raw: string | null | undefined): string {
  if (!raw) return '';
  let title = raw.toLowerCase();

  // Drop anything in brackets: "(EMEA)", "[maternity cover]".
  title = title.replace(/[([{][^)\]}]*[)\]}]/g, ' ');

  // Split on separators that introduce a second, secondary title.
  title = title.split(/\s+[-–—|/]\s+/)[0] ?? title;

  // Normalise punctuation to spaces, but keep "&" long enough to expand it.
  title = title.replace(/&/g, ' and ');
  title = title.replace(/[.,;:_"'`]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();

  for (const [pattern, replacement] of TITLE_EXPANSIONS) {
    title = title.replace(pattern, replacement);
  }

  const words = title.split(/\s+/).filter(Boolean);
  const cleaned: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    // Remove standalone region noise tokens.
    if (TITLE_NOISE.includes(word)) continue;
    cleaned.push(word);
  }

  // Remove multi-word noise phrases left over after token filtering.
  let result = cleaned.join(' ');
  for (const noise of TITLE_NOISE) {
    if (!noise.includes(' ')) continue;
    result = result.replace(new RegExp(`\\b${noise}\\b`, 'g'), ' ');
  }

  return result.replace(/\s+/g, ' ').trim();
}

const SENIORITY_PATTERNS: Array<[RegExp, Seniority]> = [
  [/\bchief\b|\bchief executive officer\b|^c[a-z]{1,2}o$/, 'C_LEVEL'],
  [/\bexecutive vice president\b/, 'EVP'],
  [/\bsenior vice president\b/, 'SVP'],
  [/\bvice president\b/, 'VP'],
  [/\bglobal head\b|\bgroup head\b|\bhead of\b|\bhead\b/, 'HEAD'],
  [/\bmanaging director\b|\bdirector\b/, 'DIRECTOR'],
  [/\bsenior manager\b|\bsenior general manager\b/, 'SENIOR_MANAGER'],
  [/\bgeneral manager\b|\bmanager\b|\bsuperintendent\b/, 'MANAGER'],
  [/\bteam lead\b|\bteam leader\b|\bsupervisor\b|\blead\b/, 'TEAM_LEAD'],
  [/\bsenior\b|\bprincipal\b|\bstaff\b/, 'SENIOR_INDIVIDUAL'],
  [/\banalyst\b|\bspecialist\b|\bengineer\b|\bconsultant\b|\bexecutive\b|\bofficer\b|\brepresentative\b|\bagent\b|\badvisor\b|\bcoordinator\b|\bassociate\b/, 'INDIVIDUAL'],
];

/** Infer seniority from a normalized title. Order matters: most senior first. */
export function inferSeniority(normalizedTitle: string): Seniority {
  if (!normalizedTitle) return 'UNKNOWN';
  for (const [pattern, seniority] of SENIORITY_PATTERNS) {
    if (pattern.test(normalizedTitle)) return seniority;
  }
  return 'UNKNOWN';
}

/** Rank used for "relevant seniority" comparisons. Higher is more senior. */
export const SENIORITY_RANK: Record<Seniority, number> = {
  C_LEVEL: 10,
  EVP: 9,
  SVP: 8,
  VP: 7,
  HEAD: 6,
  DIRECTOR: 5,
  SENIOR_MANAGER: 4,
  MANAGER: 3,
  TEAM_LEAD: 2,
  SENIOR_INDIVIDUAL: 1,
  INDIVIDUAL: 0,
  UNKNOWN: -1,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

export function isValidEmail(raw: string | null | undefined): boolean {
  const email = normalizeEmail(raw);
  return email !== null && EMAIL_PATTERN.test(email);
}

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com',
  'outlook.com', 'live.com', 'aol.com', 'icloud.com', 'proton.me',
  'protonmail.com', 'mail.com', 'yandex.com', 'gmx.com', 'qq.com',
]);

export function emailDomain(raw: string | null | undefined): string | null {
  const email = normalizeEmail(raw);
  if (!email || !EMAIL_PATTERN.test(email)) return null;
  return email.split('@')[1] ?? null;
}

/** True for consumer mailbox domains, which never prove company affiliation. */
export function isFreeEmailDomain(raw: string | null | undefined): boolean {
  const domain = emailDomain(raw);
  return domain !== null && FREE_EMAIL_DOMAINS.has(domain);
}

/** Strip protocol, www and path from a website or email domain. */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  value = value.split('/')[0] ?? value;
  value = value.split('?')[0] ?? value;
  if (value.includes('@')) value = value.split('@')[1] ?? value;
  return value.includes('.') ? value : null;
}

/**
 * Reduce a phone number to E.164-ish digits. When the number is local and the
 * country is known, the calling code is prepended so that de-duplication
 * compares like with like.
 */
export function normalizePhone(
  raw: string | null | undefined,
  country?: string | null,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;

  if (hasPlus) return `+${digits}`;

  const info = resolveCountry(country);
  if (!info) return `+${digits}`;

  const code = info.callingCode.replace('+', '');
  if (digits.startsWith(code) && digits.length > code.length + 5) return `+${digits}`;
  // Strip a national trunk prefix before prepending the country code.
  const national = digits.replace(/^0+/, '');
  return `+${code}${national}`;
}

/** A phone number is usable when it has a country code and enough digits. */
export function isValidPhone(normalized: string | null | undefined): boolean {
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function normalizePersonName(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

/** Collapse a company name for comparison: "Acme Corp." and "ACME" match. */
export function companyKey(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|company|gmbh|sa|sas|sarl|bv|nv|plc|pte|pvt|group|holdings?|international)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function employeeBandFromCount(count: number | null | undefined): EmployeeBand {
  if (count === null || count === undefined || Number.isNaN(count) || count <= 0) return 'UNKNOWN';
  if (count <= 50) return 'BAND_1_50';
  if (count <= 200) return 'BAND_51_200';
  if (count <= 500) return 'BAND_201_500';
  if (count <= 1000) return 'BAND_501_1000';
  if (count <= 5000) return 'BAND_1001_5000';
  if (count <= 10000) return 'BAND_5001_10000';
  return 'BAND_10000_PLUS';
}

/** Parse "$250M", "1.2bn", "45,000,000" into a revenue band. */
export function revenueBandFromValue(raw: string | number | null | undefined): RevenueBand {
  if (raw === null || raw === undefined || raw === '') return 'UNKNOWN';

  let amount: number;
  if (typeof raw === 'number') {
    amount = raw;
  } else {
    const text = raw.toLowerCase().replace(/[$€£,\s]/g, '');
    const match = text.match(/^([\d.]+)\s*(k|m|mm|bn|b|t)?/);
    if (!match) return 'UNKNOWN';
    const base = Number.parseFloat(match[1]!);
    if (Number.isNaN(base)) return 'UNKNOWN';
    const suffix = match[2];
    const multiplier =
      suffix === 'k' ? 1e3 :
      suffix === 'm' || suffix === 'mm' ? 1e6 :
      suffix === 'b' || suffix === 'bn' ? 1e9 :
      suffix === 't' ? 1e12 : 1;
    amount = base * multiplier;
  }

  if (amount <= 0) return 'UNKNOWN';
  if (amount < 10e6) return 'UNDER_10M';
  if (amount < 50e6) return 'USD_10M_50M';
  if (amount < 250e6) return 'USD_50M_250M';
  if (amount < 1e9) return 'USD_250M_1B';
  if (amount < 5e9) return 'USD_1B_5B';
  return 'OVER_5B';
}

export const EMPLOYEE_BAND_LABELS: Record<EmployeeBand, string> = {
  BAND_1_50: '1-50',
  BAND_51_200: '51-200',
  BAND_201_500: '201-500',
  BAND_501_1000: '501-1,000',
  BAND_1001_5000: '1,001-5,000',
  BAND_5001_10000: '5,001-10,000',
  BAND_10000_PLUS: '10,000+',
  UNKNOWN: 'Unknown',
};

export const REVENUE_BAND_LABELS: Record<RevenueBand, string> = {
  UNDER_10M: 'Under $10M',
  USD_10M_50M: '$10M-$50M',
  USD_50M_250M: '$50M-$250M',
  USD_250M_1B: '$250M-$1B',
  USD_1B_5B: '$1B-$5B',
  OVER_5B: 'Over $5B',
  UNKNOWN: 'Unknown',
};

/** Case- and whitespace-insensitive membership test used across targeting. */
export function listIncludes(list: string[] | null | undefined, value: string | null | undefined): boolean {
  if (!list || list.length === 0 || !value) return false;
  const needle = value.trim().toLowerCase();
  return list.some((entry) => entry.trim().toLowerCase() === needle);
}

/** True when any term appears as a whole phrase inside the haystack. */
export function containsAnyTerm(haystack: string, terms: string[] | null | undefined): string | null {
  if (!terms || terms.length === 0 || !haystack) return null;
  const text = ` ${haystack.toLowerCase()} `;
  for (const term of terms) {
    const needle = term.trim().toLowerCase();
    if (!needle) continue;
    if (text.includes(` ${needle} `) || text.includes(needle)) return term;
  }
  return null;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
