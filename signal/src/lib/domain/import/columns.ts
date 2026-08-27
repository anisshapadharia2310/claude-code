/**
 * Canonical import columns and the header spellings seen in the wild. The import
 * wizard uses these to propose a mapping, which the user can always override.
 */
export interface ColumnDefinition {
  key: string;
  label: string;
  required: boolean;
  /** At least one column in the same group must be present. */
  requiredGroup?: string;
  aliases: string[];
  help: string;
}

export const IMPORT_COLUMNS: ColumnDefinition[] = [
  {
    key: 'companyName',
    label: 'Company name',
    required: true,
    aliases: ['company', 'company name', 'account', 'account name', 'organisation', 'organization', 'employer'],
    help: 'The account the contact works for.',
  },
  {
    key: 'firstName',
    label: 'Contact first name',
    required: true,
    aliases: ['first name', 'firstname', 'given name', 'forename', 'first'],
    help: 'Used for personalisation in call and email templates.',
  },
  {
    key: 'lastName',
    label: 'Contact last name',
    required: true,
    aliases: ['last name', 'lastname', 'surname', 'family name', 'last'],
    help: 'Used together with the company for duplicate detection.',
  },
  {
    key: 'jobTitle',
    label: 'Job title',
    required: true,
    aliases: ['title', 'job title', 'position', 'role', 'designation'],
    help: 'Normalised on import. Never used on its own to qualify a contact.',
  },
  {
    key: 'industry',
    label: 'Industry',
    required: true,
    aliases: ['industry', 'sector', 'vertical'],
    help: 'Checked against the campaign target industries by the relevance gate.',
  },
  {
    key: 'country',
    label: 'Country',
    required: true,
    aliases: ['country', 'country name', 'location country', 'geo'],
    help: 'Normalised to a canonical name, with time zone and language inferred.',
  },
  {
    key: 'workEmail',
    label: 'Work email',
    required: false,
    requiredGroup: 'reachability',
    aliases: ['email', 'work email', 'e-mail', 'business email', 'email address'],
    help: 'Either an email or a phone number is required.',
  },
  {
    key: 'phoneNumber',
    label: 'Phone number',
    required: false,
    requiredGroup: 'reachability',
    aliases: ['phone', 'phone number', 'mobile', 'telephone', 'direct dial', 'cell'],
    help: 'Either an email or a phone number is required.',
  },
  // --- Optional columns ----------------------------------------------------
  { key: 'city', label: 'City', required: false, aliases: ['city', 'town', 'location city'], help: 'Optional.' },
  { key: 'revenue', label: 'Revenue', required: false, aliases: ['revenue', 'annual revenue', 'turnover'], help: 'Parsed into a revenue band.' },
  { key: 'employeeCount', label: 'Employee count', required: false, aliases: ['employees', 'employee count', 'headcount', 'company size', 'size'], help: 'Parsed into an employee band.' },
  { key: 'department', label: 'Department', required: false, aliases: ['department', 'dept', 'function', 'business unit'], help: 'Key corroborating evidence for role relevance.' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', required: false, aliases: ['linkedin', 'linkedin url', 'linkedin profile', 'li url'], help: 'Optional research reference.' },
  { key: 'technology', label: 'Technology', required: false, aliases: ['technology', 'tech stack', 'technologies', 'software'], help: 'Semicolon-separated list.' },
  { key: 'contactSource', label: 'Contact source', required: false, aliases: ['source', 'contact source', 'lead source', 'origin'], help: 'Scores one data-quality point.' },
  { key: 'existingRelationship', label: 'Existing relationship', required: false, aliases: ['existing relationship', 'relationship', 'client status', 'customer status'], help: 'Current client, past client, partner, or none.' },
  { key: 'consentStatus', label: 'Consent status', required: false, aliases: ['consent', 'consent status', 'opt in', 'opt-in status', 'gdpr status'], help: 'Feeds the compliance gate.' },
  { key: 'domain', label: 'Company domain', required: false, aliases: ['domain', 'website', 'company domain', 'url'], help: 'Improves duplicate detection.' },
  { key: 'subIndustry', label: 'Sub-industry', required: false, aliases: ['sub industry', 'sub-industry', 'subsector'], help: 'Optional refinement of the industry.' },
];

export const REQUIRED_COLUMN_KEYS = IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);

/** Column keys where at least one of the group must be mapped. */
export const REQUIRED_GROUPS: Record<string, string[]> = IMPORT_COLUMNS.reduce(
  (groups, column) => {
    if (!column.requiredGroup) return groups;
    (groups[column.requiredGroup] ??= []).push(column.key);
    return groups;
  },
  {} as Record<string, string[]>,
);

function canonicalHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');
}

export interface ProposedMapping {
  /** CSV header -> canonical column key (or null when unmapped). */
  mapping: Record<string, string | null>;
  unmappedRequired: string[];
  missingReachability: boolean;
}

/** Proposes a column mapping from the CSV headers, for the user to confirm. */
export function proposeMapping(headers: string[]): ProposedMapping {
  const mapping: Record<string, string | null> = {};
  const used = new Set<string>();

  for (const header of headers) {
    const canonical = canonicalHeader(header);
    const match = IMPORT_COLUMNS.find(
      (column) =>
        !used.has(column.key) &&
        (canonical === column.key.toLowerCase() ||
          canonical === column.label.toLowerCase() ||
          column.aliases.map(canonicalHeader).includes(canonical)),
    );
    mapping[header] = match?.key ?? null;
    if (match) used.add(match.key);
  }

  const unmappedRequired = REQUIRED_COLUMN_KEYS.filter((key) => !used.has(key));
  const missingReachability = !REQUIRED_GROUPS.reachability?.some((key) => used.has(key));

  return { mapping, unmappedRequired, missingReachability };
}
