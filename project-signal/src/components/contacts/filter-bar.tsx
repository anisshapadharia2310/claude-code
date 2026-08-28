import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { humanize } from '@/lib/utils';
import type { ContactFilters } from '@/server/services/filters';

const PRIORITIES = ['P1', 'P2', 'P3', 'COMPLIANCE_HOLD', 'REJECT'];
const ROLE_CATEGORIES = [
  'DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR',
  'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN',
];
const SENIORITIES = [
  'C_LEVEL', 'EVP', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER', 'MANAGER',
  'TEAM_LEAD', 'SENIOR_INDIVIDUAL', 'INDIVIDUAL', 'UNKNOWN',
];
const EMPLOYEE_BANDS = [
  'BAND_1_50', 'BAND_51_200', 'BAND_201_500', 'BAND_501_1000',
  'BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS', 'UNKNOWN',
];
const EMAIL_STATUSES = ['VERIFIED', 'VALID', 'CATCH_ALL', 'UNVERIFIED', 'RISKY', 'INVALID', 'BOUNCED', 'MISSING'];
const PHONE_STATUSES = ['VERIFIED', 'VALID', 'UNVERIFIED', 'INVALID', 'WRONG_NUMBER', 'DO_NOT_CALL', 'MISSING'];
const WHATSAPP_STATUSES = ['AVAILABLE_OPTED_IN', 'AVAILABLE_NO_CONSENT', 'NOT_AVAILABLE', 'OPTED_OUT', 'BLOCKED_BY_POLICY', 'UNKNOWN'];
const CONSENT_STATUSES = ['EXPLICIT_OPT_IN', 'SOFT_OPT_IN', 'LEGITIMATE_INTEREST', 'NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT'];
const STATUSES = [
  'NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED',
  'ATTENDED', 'MEETING_SET', 'NURTURE', 'CLOSED_LOST', 'DO_NOT_CONTACT',
];
const TRIGGERS = [
  'ANY', 'NONE', 'TRANSFORMATION', 'HIRING', 'EXPANSION', 'MERGER',
  'LEADERSHIP', 'REGULATORY', 'STATED_PRIORITY',
];
const EVENT_TYPES = [
  'WEBINAR_REGISTERED', 'WEBINAR_ATTENDED', 'WEBINAR_ATTENDANCE_80_PERCENT',
  'POSITIVE_EMAIL_REPLY', 'WHITEPAPER_DOWNLOADED', 'MEETING_REQUESTED',
  'CTA_CLICKED', 'QUESTION_ASKED', 'REPLAY_WATCHED', 'OPTED_OUT',
];
const SORTS: Array<[string, string]> = [
  ['totalScore', 'Total score'],
  ['roleRelevanceScore', 'Role relevance'],
  ['triggerScore', 'Trigger score'],
  ['attendanceLikelihoodScore', 'Attendance likelihood'],
  ['lastVerifiedAt', 'Last verified'],
  ['nextFollowUpAt', 'Next follow-up'],
  ['companyName', 'Company'],
  ['lastName', 'Surname'],
  ['priority', 'Priority'],
];

function MultiSelect({
  name, label, options, selected, format = humanize, size = 4,
}: {
  name: string;
  label: string;
  options: string[];
  selected: string[];
  format?: (value: string) => string;
  size?: number;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        multiple
        size={size}
        defaultValue={selected}
        className="w-full rounded-md border border-navy-200 bg-white px-2 py-1 text-xs text-navy-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>{format(option)}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * A plain GET form. Filters live in the URL, so a filtered list can be
 * bookmarked, shared with a colleague, and works without client JavaScript.
 */
export function FilterBar({
  filters, options, callers, basePath = '/contacts',
}: {
  filters: ContactFilters;
  options: { countries: string[]; industries: string[]; technologies: string[] };
  callers: Array<{ id: string; name: string }>;
  basePath?: string;
}) {
  return (
    <form method="get" action={basePath} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q" name="q" type="search" defaultValue={filters.q}
            placeholder="Name, company, job title, email or domain"
          />
        </div>
        <div className="w-40">
          <Label htmlFor="sort">Sort by</Label>
          <Select id="sort" name="sort" defaultValue={filters.sort}>
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <div className="w-32">
          <Label htmlFor="dir">Direction</Label>
          <Select id="dir" name="dir" defaultValue={filters.dir}>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </Select>
        </div>
        <Button type="submit" size="md">Apply filters</Button>
        <ButtonLink href={basePath} variant="ghost" size="md">Clear</ButtonLink>
      </div>

      <details className="rounded-md border border-line bg-white px-4 py-3" open={hasNarrowing(filters)}>
        <summary className="cursor-pointer text-sm font-medium text-navy-700">
          Detailed filters
        </summary>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MultiSelect name="priority" label="Priority" options={PRIORITIES} selected={filters.priority} />
          <MultiSelect name="roleCategory" label="Role category" options={ROLE_CATEGORIES} selected={filters.roleCategory} />
          <MultiSelect name="seniority" label="Seniority" options={SENIORITIES} selected={filters.seniority} />
          <MultiSelect name="country" label="Country" options={options.countries} selected={filters.country} format={(value) => value} />
          <MultiSelect name="industry" label="Industry" options={options.industries} selected={filters.industry} format={(value) => value} />
          <MultiSelect name="employeeBand" label="Company size" options={EMPLOYEE_BANDS} selected={filters.employeeBand} />
          <MultiSelect name="technology" label="Technology" options={options.technologies} selected={filters.technology} format={(value) => value} />
          <MultiSelect name="trigger" label="Business trigger" options={TRIGGERS} selected={filters.trigger} />
          <MultiSelect name="emailStatus" label="Email status" options={EMAIL_STATUSES} selected={filters.emailStatus} />
          <MultiSelect name="phoneStatus" label="Phone status" options={PHONE_STATUSES} selected={filters.phoneStatus} />
          <MultiSelect name="whatsappStatus" label="WhatsApp status" options={WHATSAPP_STATUSES} selected={filters.whatsappStatus} />
          <MultiSelect name="consentStatus" label="Consent status" options={CONSENT_STATUSES} selected={filters.consentStatus} />
          <MultiSelect name="status" label="Outreach status" options={STATUSES} selected={filters.status} />

          <div>
            <Label htmlFor="eventType">Engagement event</Label>
            <Select id="eventType" name="eventType" defaultValue={filters.eventType ?? ''}>
              <option value="">Any</option>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
            </Select>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigned to</Label>
            <Select id="assignedTo" name="assignedTo" defaultValue={filters.assignedTo ?? ''}>
              <option value="">Anyone</option>
              {callers.map((caller) => <option key={caller.id} value={caller.id}>{caller.name}</option>)}
            </Select>
          </div>

          <div>
            <Label htmlFor="verifiedBefore">Last verified before</Label>
            <Input id="verifiedBefore" name="verifiedBefore" type="date" defaultValue={filters.verifiedBefore ?? ''} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="scoreMin">Score from</Label>
              <Input id="scoreMin" name="scoreMin" type="number" min={0} max={100} defaultValue={filters.scoreMin ?? ''} />
            </div>
            <div className="flex-1">
              <Label htmlFor="scoreMax">to</Label>
              <Input id="scoreMax" name="scoreMax" type="number" min={0} max={100} defaultValue={filters.scoreMax ?? ''} />
            </div>
          </div>

          <label className="flex items-end gap-2 pb-2 text-sm text-navy-700">
            <input
              type="checkbox" name="reviewOnly" value="1" defaultChecked={filters.reviewOnly}
              className="h-4 w-4 rounded border-navy-300 text-brand-600"
            />
            Needs human review
          </label>
        </div>

        <p className="mt-3 text-xs text-navy-500">
          Hold Ctrl (or Cmd) to select more than one value in a list.
        </p>
      </details>
    </form>
  );
}

function hasNarrowing(filters: ContactFilters): boolean {
  return filters.priority.length > 0 || filters.roleCategory.length > 0
    || filters.country.length > 0 || filters.industry.length > 0
    || filters.reviewOnly || filters.scoreMin !== null || filters.eventType !== null;
}
