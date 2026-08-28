import { ButtonLink, Button } from '@/components/ui/button';
import { Field, Input, InputWithIcon, Label, MultiSelectList, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
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
  name, label, options, selected, format = humanize, size = 5,
}: {
  name: string;
  label: string;
  options: string[];
  selected: string[];
  format?: (value: string) => string;
  size?: number;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name}>
        {label}
        {selected.length > 0 ? (
          <Badge tone="brand" size="sm" className="ml-1">{selected.length}</Badge>
        ) : null}
      </Label>
      <MultiSelectList id={name} name={name} size={size} defaultValue={selected}>
        {options.map((option) => (
          <option key={option} value={option}>{format(option)}</option>
        ))}
      </MultiSelectList>
    </div>
  );
}

/**
 * Filters.
 *
 * A plain GET form: the state lives in the URL, so a filtered view can be
 * bookmarked, shared with a colleague, and works with JavaScript disabled. The
 * detailed panel opens automatically when a filter is already narrowing the
 * list, so nothing is ever silently applied behind a closed disclosure.
 */
export function FilterBar({
  filters, options, callers, basePath = '/contacts', activeCount = 0,
}: {
  filters: ContactFilters;
  options: { countries: string[]; industries: string[]; technologies: string[] };
  callers: Array<{ id: string; name: string }>;
  basePath?: string;
  activeCount?: number;
}) {
  const narrowing = hasNarrowing(filters);

  return (
    <form method="get" action={basePath} className="rounded-xl border border-line bg-surface shadow-xs">
      <div className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="q">Search</Label>
          <InputWithIcon
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, company, job title, email or domain"
          />
        </div>

        <div className="w-44">
          <Label htmlFor="sort">Sort by</Label>
          <Select id="sort" name="sort" defaultValue={filters.sort}>
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>

        <div className="w-36">
          <Label htmlFor="dir">Direction</Label>
          <Select id="dir" name="dir" defaultValue={filters.dir}>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" icon="filter">Apply</Button>
          {activeCount > 0 || narrowing || filters.q ? (
            <ButtonLink href={basePath} variant="ghost" icon="close">Clear</ButtonLink>
          ) : null}
        </div>
      </div>

      <details className="group border-t border-line" open={narrowing}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50">
          <span className="flex items-center gap-2">
            <Icon
              name="chevronRight"
              className="h-4 w-4 text-navy-400 transition-transform duration-[180ms] group-open:rotate-90"
            />
            Detailed filters
            {activeCount > 0 ? (
              <Badge tone="brand" size="sm">{activeCount} active</Badge>
            ) : null}
          </span>
          <span className="text-xs font-normal text-navy-400">
            Hold Ctrl or Cmd to choose more than one value
          </span>
        </summary>

        <div className="border-t border-line bg-surface-sunk px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

            <Field label="Engagement event" htmlFor="eventType">
              <Select id="eventType" name="eventType" defaultValue={filters.eventType ?? ''}>
                <option value="">Any</option>
                {EVENT_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
              </Select>
            </Field>

            <Field label="Assigned to" htmlFor="assignedTo">
              <Select id="assignedTo" name="assignedTo" defaultValue={filters.assignedTo ?? ''}>
                <option value="">Anyone</option>
                {callers.map((caller) => <option key={caller.id} value={caller.id}>{caller.name}</option>)}
              </Select>
            </Field>

            <Field label="Last verified before" htmlFor="verifiedBefore" hint="Finds records that have gone stale.">
              <Input id="verifiedBefore" name="verifiedBefore" type="date" defaultValue={filters.verifiedBefore ?? ''} />
            </Field>

            <div>
              <Label>Score range</Label>
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Minimum score" name="scoreMin" type="number" min={0} max={100}
                  placeholder="0" defaultValue={filters.scoreMin ?? ''}
                />
                <span aria-hidden="true" className="text-xs text-navy-400">to</span>
                <Input
                  aria-label="Maximum score" name="scoreMax" type="number" min={0} max={100}
                  placeholder="100" defaultValue={filters.scoreMax ?? ''}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 self-end rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-navy-700 transition-colors hover:border-navy-300">
              <input
                type="checkbox" name="reviewOnly" value="1" defaultChecked={filters.reviewOnly}
                className="h-4 w-4 rounded-xs border-line-strong text-brand-600"
              />
              Needs human review
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button type="submit" size="sm" icon="filter">Apply filters</Button>
            <ButtonLink href={basePath} variant="ghost" size="sm">Reset all</ButtonLink>
          </div>
        </div>
      </details>
    </form>
  );
}

function hasNarrowing(filters: ContactFilters): boolean {
  return filters.priority.length > 0 || filters.roleCategory.length > 0
    || filters.country.length > 0 || filters.industry.length > 0
    || filters.seniority.length > 0 || filters.technology.length > 0
    || filters.trigger.length > 0 || filters.status.length > 0
    || filters.emailStatus.length > 0 || filters.phoneStatus.length > 0
    || filters.whatsappStatus.length > 0 || filters.consentStatus.length > 0
    || filters.reviewOnly || filters.scoreMin !== null || filters.scoreMax !== null
    || filters.eventType !== null || filters.assignedTo !== null
    || filters.verifiedBefore !== null;
}
