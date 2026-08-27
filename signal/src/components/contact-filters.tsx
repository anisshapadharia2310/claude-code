'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ConsentStatus,
  DecisionRole,
  EmailStatus,
  EmployeeBand,
  EventType,
  PhoneStatus,
  Priority,
  RoleCategory,
  Seniority,
  WhatsAppStatus,
} from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { humanize } from '@/lib/utils';

interface Options {
  countries: string[];
  industries: string[];
  technologies: string[];
  campaigns: Array<{ id: string; name: string }>;
}

const TRIGGERS = [
  ['', 'Any trigger state'],
  ['ANY', 'Has any trigger'],
  ['TRANSFORMATION', 'Transformation project'],
  ['HIRING', 'Relevant hiring'],
  ['MERGER', 'Merger or acquisition'],
  ['LEADERSHIP', 'Leadership change'],
  ['REGULATORY', 'Regulatory pressure'],
] as const;

const SORTS = [
  ['totalScore', 'Total score'],
  ['roleRelevanceScore', 'Role relevance'],
  ['triggerScore', 'Trigger score'],
  ['attendanceLikelihoodScore', 'Attendance likelihood'],
  ['dataQualityScore', 'Data quality'],
  ['lastVerifiedAt', 'Last verified date'],
  ['nextFollowUpAt', 'Next follow-up date'],
  ['companyName', 'Company name'],
] as const;

/**
 * A single GET form. Filters live in the URL, so any view is shareable and the
 * export link can reuse exactly the same query.
 */
export function ContactFilters({ options }: { options: Options }) {
  const router = useRouter();
  const params = useSearchParams();
  const value = (key: string) => params.get(key) ?? '';
  const multi = (key: string) => params.getAll(key);

  return (
    <form
      method="get"
      className="grid gap-3 rounded-lg border border-navy-200 bg-card p-3 md:grid-cols-4 xl:grid-cols-6"
      onSubmit={() => undefined}
    >
      <div className="md:col-span-2 space-y-1">
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" defaultValue={value('q')} placeholder="Name, company, title, email, or domain" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="campaign">Campaign</Label>
        <Select id="campaign" name="campaign" defaultValue={value('campaign')}>
          <option value="">All campaigns</option>
          {options.campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="priority">Priority</Label>
        <Select id="priority" name="priority" multiple size={3} className="h-auto" defaultValue={multi('priority')}>
          {Object.values(Priority).map((p) => (
            <option key={p} value={p}>
              {humanize(p)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="country">Country</Label>
        <Select id="country" name="country" multiple size={3} className="h-auto" defaultValue={multi('country')}>
          {options.countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="industry">Industry</Label>
        <Select id="industry" name="industry" multiple size={3} className="h-auto" defaultValue={multi('industry')}>
          {options.industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="employeeBand">Company size</Label>
        <Select id="employeeBand" name="employeeBand" multiple size={3} className="h-auto" defaultValue={multi('employeeBand')}>
          {Object.values(EmployeeBand).map((band) => (
            <option key={band} value={band}>
              {humanize(band).replace('Band ', '')}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="seniority">Seniority</Label>
        <Select id="seniority" name="seniority" multiple size={3} className="h-auto" defaultValue={multi('seniority')}>
          {Object.values(Seniority).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="roleCategory">Role category</Label>
        <Select id="roleCategory" name="roleCategory" multiple size={3} className="h-auto" defaultValue={multi('roleCategory')}>
          {Object.values(RoleCategory).map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="decisionRole">Decision role</Label>
        <Select id="decisionRole" name="decisionRole" multiple size={3} className="h-auto" defaultValue={multi('decisionRole')}>
          {Object.values(DecisionRole).map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="technology">Technology</Label>
        <Select id="technology" name="technology" defaultValue={value('technology')}>
          <option value="">Any technology</option>
          {options.technologies.map((tech) => (
            <option key={tech} value={tech}>
              {tech}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="trigger">Business trigger</Label>
        <Select id="trigger" name="trigger" defaultValue={value('trigger')}>
          {TRIGGERS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Score range</Label>
        <div className="flex gap-1">
          <Input name="minScore" type="number" min={0} max={100} placeholder="min" defaultValue={value('minScore')} className="numeric" />
          <Input name="maxScore" type="number" min={0} max={100} placeholder="max" defaultValue={value('maxScore')} className="numeric" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="emailStatus">Email status</Label>
        <Select id="emailStatus" name="emailStatus" multiple size={3} className="h-auto" defaultValue={multi('emailStatus')}>
          {Object.values(EmailStatus).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phoneStatus">Phone status</Label>
        <Select id="phoneStatus" name="phoneStatus" multiple size={3} className="h-auto" defaultValue={multi('phoneStatus')}>
          {Object.values(PhoneStatus).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="whatsappStatus">WhatsApp status</Label>
        <Select id="whatsappStatus" name="whatsappStatus" multiple size={3} className="h-auto" defaultValue={multi('whatsappStatus')}>
          {Object.values(WhatsAppStatus).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="consentStatus">Consent status</Label>
        <Select id="consentStatus" name="consentStatus" multiple size={3} className="h-auto" defaultValue={multi('consentStatus')}>
          {Object.values(ConsentStatus).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="engagementEvent">Engagement event</Label>
        <Select id="engagementEvent" name="engagementEvent" defaultValue={value('engagementEvent')}>
          <option value="">Any engagement</option>
          {Object.values(EventType).map((e) => (
            <option key={e} value={e}>
              {humanize(e)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sort">Sort by</Label>
        <div className="flex gap-1">
          <Select id="sort" name="sort" defaultValue={value('sort') || 'totalScore'}>
            {SORTS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="direction" defaultValue={value('direction') || 'desc'} className="w-24">
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </Select>
        </div>
      </div>

      <div className="flex items-end gap-2 md:col-span-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => router.push('/contacts')}>
          Clear
        </Button>
      </div>
    </form>
  );
}
