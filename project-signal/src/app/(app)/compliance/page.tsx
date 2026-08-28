import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/form';
import { Alert, PageHeader, Stat } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { ADMIN_LEGAL_WARNING, evaluateCompliance } from '@/domain/compliance';
import { formatDate, formatNumber, humanize } from '@/lib/utils';
import { updateComplianceRecordAction, updateCountryRuleAction } from '@/server/actions/admin';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';

export const metadata: Metadata = { title: 'Compliance' };

const CHANNELS = ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST'];

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; status?: string }>;
}) {
  const user = await requirePermission('viewCompliance');
  const { contactId, status } = await searchParams;

  const repo = await getRepository();
  const [rules, contacts] = await Promise.all([repo.listCountryRules(), repo.listContacts()]);
  const rulesByCountry = new Map(rules.map((rule) => [rule.country, rule]));

  const evaluated = contacts.map((contact) => ({
    contact,
    record: contact.complianceRecords[0] ?? null,
    result: evaluateCompliance({
      contact,
      record: contact.complianceRecords[0] ?? null,
      rule: rulesByCountry.get(contact.country) ?? null,
    }),
  }));

  const counts = {
    pass: evaluated.filter((entry) => entry.result.status === 'PASS').length,
    hold: evaluated.filter((entry) => entry.result.status === 'HOLD').length,
    blocked: evaluated.filter((entry) => entry.result.status === 'BLOCKED').length,
    dnc: evaluated.filter((entry) => entry.result.doNotContact).length,
  };

  const filtered = evaluated
    .filter((entry) => (status ? entry.result.status === status : true))
    .filter((entry) => (contactId ? entry.contact.id === contactId : true));

  const focused = contactId ? evaluated.find((entry) => entry.contact.id === contactId) ?? null : null;
  const canEditRules = can(user.role, 'editCompliance');

  return (
    <>
      <PageHeader
        eyebrow="Permission and consent"
        title="Compliance"
        description="Country-aware permission rules and the per-contact records they are evaluated against."
      />

      <Alert tone="warning" className="mb-4" title="Administrator warning">
        {ADMIN_LEGAL_WARNING} This application stores facts and evaluates them against rules you configure. It
        does not encode legal conclusions and it is not legal advice.
      </Alert>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contacts" value={formatNumber(evaluated.length)} icon="contacts" />
        <Stat label="Cleared" value={formatNumber(counts.pass)} tone="success" icon="check" />
        <Stat label="On hold" value={formatNumber(counts.hold)} tone="hold" icon="alert"
          tooltip="Required compliance information is missing. Outreach is blocked until it is completed." />
        <Stat label="Blocked" value={formatNumber(counts.blocked)} tone="reject" icon="ban"
          hint={`${counts.dnc} do-not-contact`} />
      </section>

      {focused ? (
        <Card className="mb-4">
          <CardHeader
            title={`Compliance record: ${focused.contact.firstName} ${focused.contact.lastName}`}
            description={`${focused.contact.country} · ${focused.result.summary}`}
            actions={<Link href="/compliance" className="text-xs text-brand-700 underline">Close</Link>}
          />
          <CardBody>
            {focused.result.missingFields.length > 0 ? (
              <Alert tone="warning" className="mb-4">
                Missing: {focused.result.missingFields.join(', ')}.
              </Alert>
            ) : null}

            <ActionForm action={updateComplianceRecordAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="contactId" value={focused.contact.id} />
              <input type="hidden" name="country" value={focused.contact.country} />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="consentStatus">Consent status</label>
                <Select id="consentStatus" name="consentStatus" defaultValue={focused.record?.consentStatus ?? 'NOT_CAPTURED'}>
                  {['EXPLICIT_OPT_IN', 'SOFT_OPT_IN', 'LEGITIMATE_INTEREST', 'NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT'].map((value) => (
                    <option key={value} value={value}>{humanize(value)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="lawfulBasis">Lawful basis</label>
                <Select id="lawfulBasis" name="lawfulBasis" defaultValue={focused.record?.lawfulBasis ?? 'NOT_DETERMINED'}>
                  {['CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'NOT_DETERMINED'].map((value) => (
                    <option key={value} value={value}>{humanize(value)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="consentSource">Consent source</label>
                <Input id="consentSource" name="consentSource" defaultValue={focused.record?.consentSource ?? ''}
                  placeholder="Where the permission came from" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="consentDate">Consent date</label>
                <Input id="consentDate" name="consentDate" type="date"
                  defaultValue={focused.record?.consentDate?.toISOString().slice(0, 10) ?? ''} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="optOutStatus">Opt-out status</label>
                <Select id="optOutStatus" name="optOutStatus" defaultValue={focused.record?.optOutStatus ?? 'NONE'}>
                  {['NONE', 'EMAIL_OPT_OUT', 'PHONE_OPT_OUT', 'WHATSAPP_OPT_OUT', 'GLOBAL_OPT_OUT'].map((value) => (
                    <option key={value} value={value}>{humanize(value)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="allowedChannels">Allowed channels</label>
                <Input id="allowedChannels" name="allowedChannels"
                  defaultValue={(focused.record?.allowedChannels ?? []).join(',')}
                  placeholder="EMAIL,PHONE,WHATSAPP" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="blockedChannels">Blocked channels</label>
                <Input id="blockedChannels" name="blockedChannels"
                  defaultValue={(focused.record?.blockedChannels ?? []).join(',')} />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-navy-700">
                <Checkbox name="noticeProvided" defaultChecked={focused.record?.noticeProvided ?? false} />
                Privacy notice provided
              </label>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-navy-700" htmlFor="complianceNotes">Notes</label>
                <Textarea id="complianceNotes" name="complianceNotes" rows={2}
                  defaultValue={focused.record?.complianceNotes ?? ''} />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Saving...">Save and rescore</SubmitButton>
              </div>
            </ActionForm>

            <div className="mt-4 border-t border-line pt-4">
              <p className="eyebrow">Channel evaluation</p>
              <ul className="mt-2 space-y-1 text-xs">
                {CHANNELS.map((channel) => {
                  const allowed = focused.result.allowedChannels.includes(channel as never);
                  const reason = focused.result.blockedChannels.find((entry) => entry.channel === channel)?.reason;
                  return (
                    <li key={channel} className="flex gap-2">
                      <span className={`w-20 shrink-0 font-medium ${allowed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {humanize(channel)}
                      </span>
                      <span className="text-navy-600">{allowed ? 'Permitted' : reason ?? 'Not permitted'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader
          title="Country rules"
          description="Configurable per country. Changing a rule rescores every campaign, because a compliance change can move a contact between reject, hold and workable."
          icon={<Icon name="shield" className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Country</Th><Th>Permitted channels</Th><Th>Prohibited</Th>
                  <Th>Requirements</Th><Th>Consent validity</Th>
                  {canEditRules ? <Th>Edit</Th> : null}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <Tr key={rule.id}>
                    <Td className="font-medium">{rule.country}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {rule.permittedChannels.map((channel) => (
                          <Badge key={channel} tone="success" className="text-[10px]">{humanize(channel)}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {rule.prohibitedChannels.length === 0
                          ? <span className="text-xs text-navy-400">None</span>
                          : rule.prohibitedChannels.map((channel) => (
                              <Badge key={channel} tone="danger" className="text-[10px]">{humanize(channel)}</Badge>
                            ))}
                      </div>
                    </Td>
                    <Td className="text-xs">
                      <ul className="space-y-0.5">
                        {rule.requiresExplicitOptIn ? <li>Explicit opt-in required</li> : null}
                        {rule.whatsappRequiresOptIn ? <li>WhatsApp opt-in required</li> : null}
                        {rule.requiresLawfulBasis ? <li>Lawful basis required</li> : null}
                        {rule.requiresNotice ? <li>Privacy notice required</li> : null}
                      </ul>
                      {rule.policyNotes ? <p className="mt-1 text-navy-500">{rule.policyNotes}</p> : null}
                    </Td>
                    <Td className="text-xs">{rule.consentValidityDays ? `${rule.consentValidityDays} days` : 'No expiry'}</Td>
                    {canEditRules ? (
                      <Td>
                        <ActionForm action={updateCountryRuleAction} feedbackPosition="none" className="space-y-1.5">
                          <input type="hidden" name="country" value={rule.country} />
                          <Input name="permittedChannels" defaultValue={rule.permittedChannels.join(',')}
                            className="h-7 w-44 text-[11px]" aria-label={`Permitted channels for ${rule.country}`} />
                          <Input name="prohibitedChannels" defaultValue={rule.prohibitedChannels.join(',')}
                            className="h-7 w-44 text-[11px]" aria-label={`Prohibited channels for ${rule.country}`} />
                          <Input name="consentValidityDays" type="number" min={0}
                            defaultValue={rule.consentValidityDays ?? ''} className="h-7 w-44 text-[11px]"
                            aria-label={`Consent validity days for ${rule.country}`} />
                          <div className="space-y-0.5 text-[11px]">
                            <label className="flex items-center gap-1">
                              <Checkbox name="requiresExplicitOptIn" defaultChecked={rule.requiresExplicitOptIn} /> Explicit opt-in
                            </label>
                            <label className="flex items-center gap-1">
                              <Checkbox name="whatsappRequiresOptIn" defaultChecked={rule.whatsappRequiresOptIn} /> WhatsApp opt-in
                            </label>
                            <label className="flex items-center gap-1">
                              <Checkbox name="requiresLawfulBasis" defaultChecked={rule.requiresLawfulBasis} /> Lawful basis
                            </label>
                            <label className="flex items-center gap-1">
                              <Checkbox name="requiresNotice" defaultChecked={rule.requiresNotice} /> Notice
                            </label>
                          </div>
                          <SubmitButton size="sm" variant="secondary" pendingLabel="Saving...">Save</SubmitButton>
                        </ActionForm>
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Contact records"
          description="Showing up to 200. Open a record to complete it."
          icon={<Icon name="compliance" className="h-4 w-4" />}
          actions={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by compliance status">
              {[['', 'All'], ['PASS', 'Cleared'], ['HOLD', 'On hold'], ['BLOCKED', 'Blocked']].map(([value, label]) => {
                const selected = status === value || (!status && !value);
                return (
                  <Link
                    key={label}
                    href={value ? `/compliance?status=${value}` : '/compliance'}
                    aria-current={selected ? 'true' : undefined}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-line-strong bg-surface text-navy-600 hover:border-navy-300 hover:bg-navy-50'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          }
        />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Contact</Th><Th>Country</Th><Th>Consent</Th><Th>Lawful basis</Th>
                  <Th>Opt-out</Th><Th>Allowed now</Th><Th>Status</Th><Th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <EmptyRow colSpan={8} /> : null}
                {filtered.slice(0, 200).map((entry) => (
                  <Tr key={entry.contact.id}>
                    <Td>
                      <p className="font-medium text-navy-800">{entry.contact.firstName} {entry.contact.lastName}</p>
                      <p className="text-xs text-navy-500">{entry.contact.account.companyName}</p>
                    </Td>
                    <Td className="text-xs">{entry.contact.country}</Td>
                    <Td className="text-xs">
                      {humanize(entry.record?.consentStatus ?? entry.contact.consentStatus)}
                      {entry.record?.consentDate ? (
                        <p className="text-navy-500">{formatDate(entry.record.consentDate)}</p>
                      ) : null}
                    </Td>
                    <Td className="text-xs">{humanize(entry.record?.lawfulBasis ?? 'NOT_DETERMINED')}</Td>
                    <Td className="text-xs">{humanize(entry.record?.optOutStatus ?? 'NONE')}</Td>
                    <Td className="text-xs">
                      {entry.result.allowedChannels.length === 0
                        ? <span className="text-rose-700">None</span>
                        : entry.result.allowedChannels.map(humanize).join(', ')}
                    </Td>
                    <Td>
                      <Badge tone={entry.result.status === 'PASS' ? 'success' : entry.result.status === 'HOLD' ? 'warning' : 'danger'}>
                        {entry.result.status === 'PASS' ? 'Cleared' : entry.result.status === 'HOLD' ? 'Hold' : 'Blocked'}
                      </Badge>
                    </Td>
                    <Td>
                      <Link href={`/compliance?contactId=${entry.contact.id}`} className="text-xs text-brand-700 underline">
                        Open
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
