/**
 * Country reference data.
 *
 * Import files arrive with country names written a dozen different ways
 * ("UAE", "U.A.E.", "United Arab Emirates", "Emirates"). Everything in the
 * application keys off the canonical name in this table.
 */

export interface CountryInfo {
  /** Canonical display name used everywhere in the application. */
  name: string;
  iso2: string;
  iso3: string;
  defaultTimeZone: string;
  defaultLanguage: string;
  callingCode: string;
  region: string;
  /** Lowercased aliases accepted by the importer. */
  aliases: string[];
}

export const COUNTRIES: CountryInfo[] = [
  {
    name: 'Canada', iso2: 'CA', iso3: 'CAN', defaultTimeZone: 'America/Toronto',
    defaultLanguage: 'English', callingCode: '+1', region: 'North America',
    aliases: ['canada', 'ca', 'can'],
  },
  {
    name: 'United States', iso2: 'US', iso3: 'USA', defaultTimeZone: 'America/New_York',
    defaultLanguage: 'English', callingCode: '+1', region: 'North America',
    aliases: ['united states', 'united states of america', 'usa', 'us', 'u.s.', 'u.s.a.', 'america'],
  },
  {
    name: 'Mexico', iso2: 'MX', iso3: 'MEX', defaultTimeZone: 'America/Mexico_City',
    defaultLanguage: 'Spanish', callingCode: '+52', region: 'Latin America',
    aliases: ['mexico', 'méxico', 'mexico city', 'mx', 'mex', 'estados unidos mexicanos'],
  },
  {
    name: 'Colombia', iso2: 'CO', iso3: 'COL', defaultTimeZone: 'America/Bogota',
    defaultLanguage: 'Spanish', callingCode: '+57', region: 'Latin America',
    aliases: ['colombia', 'co', 'col'],
  },
  {
    name: 'France', iso2: 'FR', iso3: 'FRA', defaultTimeZone: 'Europe/Paris',
    defaultLanguage: 'French', callingCode: '+33', region: 'Europe',
    aliases: ['france', 'fr', 'fra', 'république française'],
  },
  {
    name: 'United Kingdom', iso2: 'GB', iso3: 'GBR', defaultTimeZone: 'Europe/London',
    defaultLanguage: 'English', callingCode: '+44', region: 'Europe',
    aliases: ['united kingdom', 'uk', 'u.k.', 'great britain', 'england', 'gb', 'gbr'],
  },
  {
    name: 'Germany', iso2: 'DE', iso3: 'DEU', defaultTimeZone: 'Europe/Berlin',
    defaultLanguage: 'German', callingCode: '+49', region: 'Europe',
    aliases: ['germany', 'deutschland', 'de', 'deu', 'ger'],
  },
  {
    name: 'Spain', iso2: 'ES', iso3: 'ESP', defaultTimeZone: 'Europe/Madrid',
    defaultLanguage: 'Spanish', callingCode: '+34', region: 'Europe',
    aliases: ['spain', 'españa', 'espana', 'es', 'esp'],
  },
  {
    name: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE', defaultTimeZone: 'Asia/Dubai',
    defaultLanguage: 'Arabic', callingCode: '+971', region: 'Middle East',
    aliases: ['united arab emirates', 'uae', 'u.a.e.', 'emirates', 'ae', 'are', 'dubai', 'abu dhabi'],
  },
  {
    name: 'Saudi Arabia', iso2: 'SA', iso3: 'SAU', defaultTimeZone: 'Asia/Riyadh',
    defaultLanguage: 'Arabic', callingCode: '+966', region: 'Middle East',
    aliases: ['saudi arabia', 'ksa', 'saudi', 'kingdom of saudi arabia', 'sa', 'sau'],
  },
  {
    name: 'Oman', iso2: 'OM', iso3: 'OMN', defaultTimeZone: 'Asia/Muscat',
    defaultLanguage: 'Arabic', callingCode: '+968', region: 'Middle East',
    aliases: ['oman', 'sultanate of oman', 'om', 'omn'],
  },
  {
    name: 'Qatar', iso2: 'QA', iso3: 'QAT', defaultTimeZone: 'Asia/Qatar',
    defaultLanguage: 'Arabic', callingCode: '+974', region: 'Middle East',
    aliases: ['qatar', 'qa', 'qat'],
  },
  {
    name: 'Egypt', iso2: 'EG', iso3: 'EGY', defaultTimeZone: 'Africa/Cairo',
    defaultLanguage: 'Arabic', callingCode: '+20', region: 'Middle East and Africa',
    aliases: ['egypt', 'arab republic of egypt', 'eg', 'egy'],
  },
  {
    name: 'South Africa', iso2: 'ZA', iso3: 'ZAF', defaultTimeZone: 'Africa/Johannesburg',
    defaultLanguage: 'English', callingCode: '+27', region: 'Middle East and Africa',
    aliases: ['south africa', 'za', 'zaf', 'rsa'],
  },
  {
    name: 'Brazil', iso2: 'BR', iso3: 'BRA', defaultTimeZone: 'America/Sao_Paulo',
    defaultLanguage: 'Portuguese', callingCode: '+55', region: 'Latin America',
    aliases: ['brazil', 'brasil', 'br', 'bra'],
  },
  {
    name: 'India', iso2: 'IN', iso3: 'IND', defaultTimeZone: 'Asia/Kolkata',
    defaultLanguage: 'English', callingCode: '+91', region: 'Asia Pacific',
    aliases: ['india', 'in', 'ind', 'bharat'],
  },
  {
    name: 'Singapore', iso2: 'SG', iso3: 'SGP', defaultTimeZone: 'Asia/Singapore',
    defaultLanguage: 'English', callingCode: '+65', region: 'Asia Pacific',
    aliases: ['singapore', 'sg', 'sgp'],
  },
  {
    name: 'Australia', iso2: 'AU', iso3: 'AUS', defaultTimeZone: 'Australia/Sydney',
    defaultLanguage: 'English', callingCode: '+61', region: 'Asia Pacific',
    aliases: ['australia', 'au', 'aus'],
  },
];

const COUNTRY_LOOKUP: Map<string, CountryInfo> = (() => {
  const map = new Map<string, CountryInfo>();
  for (const country of COUNTRIES) {
    map.set(country.name.toLowerCase(), country);
    map.set(country.iso2.toLowerCase(), country);
    map.set(country.iso3.toLowerCase(), country);
    for (const alias of country.aliases) map.set(alias, country);
  }
  return map;
})();

/** City-level time zones for the cities used in campaign targeting. */
const CITY_TIME_ZONES: Record<string, string> = {
  'vancouver': 'America/Vancouver',
  'calgary': 'America/Edmonton',
  'toronto': 'America/Toronto',
  'montreal': 'America/Toronto',
  'monterrey': 'America/Monterrey',
  'guadalajara': 'America/Mexico_City',
  'mexico city': 'America/Mexico_City',
  'bogota': 'America/Bogota',
  'bogotá': 'America/Bogota',
  'medellin': 'America/Bogota',
  'medellín': 'America/Bogota',
  'paris': 'Europe/Paris',
  'lyon': 'Europe/Paris',
  'dubai': 'Asia/Dubai',
  'abu dhabi': 'Asia/Dubai',
  'riyadh': 'Asia/Riyadh',
  'jeddah': 'Asia/Riyadh',
  'dammam': 'Asia/Riyadh',
  'muscat': 'Asia/Muscat',
  'cairo': 'Africa/Cairo',
  'alexandria': 'Africa/Cairo',
};

/**
 * Resolve any spelling of a country to its canonical record.
 * Returns null when the value is not recognised, so the importer can flag the
 * row rather than silently guessing.
 */
export function resolveCountry(raw: string | null | undefined): CountryInfo | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return COUNTRY_LOOKUP.get(key)
    // "U.A.E." and "U.S.A." lose their stops.
    ?? COUNTRY_LOOKUP.get(key.replace(/\./g, ''))
    // "u a e" collapses too.
    ?? COUNTRY_LOOKUP.get(key.replace(/[.\s]/g, ''))
    ?? COUNTRY_LOOKUP.get(key.replace(/\.$/, ''))
    ?? null;
}

/** Canonical country name, or the trimmed input when unrecognised. */
export function normalizeCountry(raw: string | null | undefined): string | null {
  const resolved = resolveCountry(raw);
  if (resolved) return resolved.name;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function timeZoneFor(
  country: string | null | undefined,
  city?: string | null,
): string | null {
  if (city) {
    const cityZone = CITY_TIME_ZONES[city.trim().toLowerCase()];
    if (cityZone) return cityZone;
  }
  return resolveCountry(country)?.defaultTimeZone ?? null;
}

export function languageFor(country: string | null | undefined): string | null {
  return resolveCountry(country)?.defaultLanguage ?? null;
}

export function regionFor(country: string | null | undefined): string | null {
  return resolveCountry(country)?.region ?? null;
}
