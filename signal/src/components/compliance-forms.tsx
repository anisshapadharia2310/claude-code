'use client';
import { useActionState } from 'react';
import { Channel, ConsentRequirement, ConsentStatus, LawfulBasis, OptOutStatus } from '@prisma/client';
import { saveComplianceRecordAction, saveCountryRuleAction } from '@/lib/actions/compliance-actions';
import type { ActionState } from '@/lib/actions/campaign-actions';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { FormMessage } from '@/components/form-message';
import { humanize } from '@/lib/utils';

const initialState: ActionState = {};

const REQUIRED_FIELD_OPTIONS = [
  ['consentStatus', 'Consent status'],
  ['consentSource', 'Consent source'],
  ['consentDate', 'Consent date'],
  ['lawfulBasis', 'Lawful basis'],
  ['noticeProvided', 'Notice provided'],
  ['allowedChannels', 'Allowed channels'],
] as const;

export function CountryRuleForm({
  rule,
}: {
  rule: {
    country: string;
    emailRequirement: ConsentRequirement;
    phoneRequirement: ConsentRequirement;
    whatsappRequirement: ConsentRequirement;
    requiredFields: string[];
    noticeRequired: boolean;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(saveCountryRuleAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-navy-200 p-3">
      <input type="hidden" name="country" value={rule.country} />
      <h3 className="text-sm font-semibold text-navy-900">{rule.country}</h3>

      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ['emailRequirement', 'Email requires'],
            ['phoneRequirement', 'Phone requires'],
            ['whatsappRequirement', 'WhatsApp requires'],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="space-y-1">
            <Label htmlFor={`${rule.country}-${name}`}>{label}</Label>
            <Select id={`${rule.country}-${name}`} name={name} defaultValue={rule[name]}>
              {Object.values(ConsentRequirement).map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-medium text-navy-800">
          Fields required before outreach
        </legend>
        <div className="flex flex-wrap gap-3">
          {REQUIRED_FIELD_OPTIONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="requiredFields"
                value={value}
                defaultChecked={rule.requiredFields.includes(value)}
                className="h-3.5 w-3.5"
              />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              name="noticeRequired"
              defaultChecked={rule.noticeRequired}
              className="h-3.5 w-3.5"
            />
            Privacy notice required
          </label>
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor={`${rule.country}-notes`}>Notes</Label>
        <Textarea id={`${rule.country}-notes`} name="notes" rows={2} defaultValue={rule.notes ?? ''} />
      </div>

      <FormMessage state={state} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving...' : `Save ${rule.country} rule`}
      </Button>
    </form>
  );
}

export function ComplianceRecordForm({
  contactId,
  country,
  record,
}: {
  contactId: string;
  country: string;
  record: {
    consentStatus: ConsentStatus;
    consentSource: string | null;
    consentDate: string | null;
    lawfulBasis: LawfulBasis;
    noticeProvided: boolean;
    optOutStatus: OptOutStatus;
    allowedChannels: Channel[];
    blockedChannels: Channel[];
    complianceNotes: string | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(saveComplianceRecordAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="country" value={country} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="consentStatus">Consent status</Label>
          <Select id="consentStatus" name="consentStatus" defaultValue={record?.consentStatus ?? ConsentStatus.NOT_CAPTURED}>
            {Object.values(ConsentStatus).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="lawfulBasis">Lawful basis</Label>
          <Select id="lawfulBasis" name="lawfulBasis" defaultValue={record?.lawfulBasis ?? LawfulBasis.NOT_DETERMINED}>
            {Object.values(LawfulBasis).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="optOutStatus">Opt-out status</Label>
          <Select id="optOutStatus" name="optOutStatus" defaultValue={record?.optOutStatus ?? OptOutStatus.NONE}>
            {Object.values(OptOutStatus).map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="consentSource">Consent source</Label>
          <Input id="consentSource" name="consentSource" defaultValue={record?.consentSource ?? ''} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="consentDate">Consent date</Label>
          <Input id="consentDate" name="consentDate" type="date" defaultValue={record?.consentDate ?? ''} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="noticeProvided"
              defaultChecked={record?.noticeProvided ?? false}
              className="h-3.5 w-3.5"
            />
            Privacy notice provided
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-navy-800">Allowed channels</legend>
          <div className="flex gap-3">
            {Object.values(Channel).map((channel) => (
              <label key={channel} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  name="allowedChannels"
                  value={channel}
                  defaultChecked={record?.allowedChannels.includes(channel) ?? false}
                  className="h-3.5 w-3.5"
                />
                {humanize(channel)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-navy-800">Blocked channels</legend>
          <div className="flex gap-3">
            {Object.values(Channel).map((channel) => (
              <label key={channel} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  name="blockedChannels"
                  value={channel}
                  defaultChecked={record?.blockedChannels.includes(channel) ?? false}
                  className="h-3.5 w-3.5"
                />
                {humanize(channel)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-1">
        <Label htmlFor="complianceNotes">Compliance notes</Label>
        <Textarea id="complianceNotes" name="complianceNotes" rows={2} defaultValue={record?.complianceNotes ?? ''} />
      </div>

      <FormMessage state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving and re-scoring...' : 'Save compliance record'}
      </Button>
    </form>
  );
}
