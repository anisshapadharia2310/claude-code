import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { formatDateTime, humanize } from '@/lib/utils';
import { updateCampaignAction } from '@/server/actions/admin';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getRepository } from '@/server/repo';
import { getCampaignAnalytics } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const user = await requirePermission('viewCampaigns');
  const repo = await getRepository();
  const campaigns = await repo.listCampaigns();
  const analytics = await Promise.all(campaigns.map((campaign) => getCampaignAnalytics(repo, campaign.id)));
  const editable = can(user.role, 'editCampaign');

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Targeting criteria decide who can qualify at all. Cost drives the cost-per-verified-attendee figure."
        actions={<ButtonLink href="/campaigns/compare" variant="outline" size="sm">Compare methods</ButtonLink>}
      />

      <div className="space-y-4">
        {campaigns.map((campaign, index) => {
          const data = analytics[index];
          return (
            <Card key={campaign.id}>
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {campaign.name}
                    <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>{humanize(campaign.status)}</Badge>
                    <Badge tone="brand">{campaign.campaignType === 'WEBINAR' ? 'Webinar' : 'White paper'}</Badge>
                  </span>
                }
                description={`${campaign.clientBrand} · ${campaign.targetBusinessProblem}`}
              />
              <CardBody className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <p className="text-sm leading-relaxed text-navy-700">{campaign.description}</p>

                  {campaign.eventDate ? (
                    <p className="text-xs text-navy-600">
                      <span className="font-semibold">Event: </span>
                      {formatDateTime(campaign.eventDate)} ({campaign.eventTimeZone ?? 'UTC'})
                      {campaign.speakerInformation ? <> &middot; {campaign.speakerInformation}</> : null}
                    </p>
                  ) : null}

                  <dl className="grid gap-3 text-xs sm:grid-cols-2">
                    {[
                      ['Industries', campaign.targetIndustries],
                      ['Countries', campaign.targetCountries],
                      ['Job functions', campaign.targetJobFunctions],
                      ['Role categories', campaign.targetRoleCategories.map(humanize)],
                      ['Technologies', campaign.targetTechnologies],
                      ['Languages', campaign.preferredLanguages],
                    ].map(([label, values]) => (
                      <div key={String(label)}>
                        <dt className="font-semibold uppercase tracking-wide text-navy-500">{label}</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(values as string[]).length === 0
                            ? <span className="text-navy-400">Not restricted</span>
                            : (values as string[]).map((value) => (
                                <Badge key={value} tone="neutral" className="text-[10px]">{value}</Badge>
                              ))}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-navy-500">Relevant title terms</p>
                      <p className="mt-1 leading-relaxed text-navy-600">{campaign.relevantTitleTerms.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-rose-700">Excluded title terms</p>
                      <p className="mt-1 leading-relaxed text-navy-600">{campaign.excludedTitleTerms.join(', ') || 'None'}</p>
                      <p className="mt-1 text-[11px] text-navy-500">
                        These are the titles that pass a naive keyword filter and waste caller time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {data ? (
                    <dl className="grid grid-cols-2 gap-2 rounded-md border border-line bg-navy-50 px-3 py-3 text-xs">
                      <div><dt className="text-navy-500">Contacts</dt><dd className="tabular text-lg font-semibold">{data.kpis.totalContacts}</dd></div>
                      <div><dt className="text-navy-500">P1</dt><dd className="tabular text-lg font-semibold text-brand-700">{data.kpis.byPriority.P1}</dd></div>
                      <div><dt className="text-navy-500">P2</dt><dd className="tabular text-lg font-semibold text-cyan-700">{data.kpis.byPriority.P2}</dd></div>
                      <div><dt className="text-navy-500">Registered</dt><dd className="tabular text-lg font-semibold">{data.kpis.registrations}</dd></div>
                    </dl>
                  ) : null}

                  {editable ? (
                    <ActionForm action={updateCampaignAction} className="space-y-2 rounded-md border border-line p-3">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`cost-${campaign.id}`}>Campaign cost</Label>
                          <Input id={`cost-${campaign.id}`} name="campaignCost" type="number" min={0} step="0.01"
                            defaultValue={campaign.campaignCost ? Number(campaign.campaignCost) : ''} />
                        </div>
                        <div className="w-24">
                          <Label htmlFor={`cur-${campaign.id}`}>Currency</Label>
                          <Input id={`cur-${campaign.id}`} name="campaignCurrency" maxLength={3}
                            defaultValue={campaign.campaignCurrency} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`status-${campaign.id}`}>Status</Label>
                        <Select id={`status-${campaign.id}`} name="status" defaultValue={campaign.status}>
                          {['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map((status) => (
                            <option key={status} value={status}>{humanize(status)}</option>
                          ))}
                        </Select>
                      </div>
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Saving...">Save</SubmitButton>
                    </ActionForm>
                  ) : (
                    <p className="text-xs text-navy-500">
                      Cost: {campaign.campaignCost ? `${campaign.campaignCurrency} ${Number(campaign.campaignCost)}` : 'not set'}
                    </p>
                  )}

                  {can(user.role, 'editScoringWeights') ? (
                    <ButtonLink href={`/admin/scoring?campaignId=${campaign.id}`} variant="outline" size="sm" className="w-full">
                      Edit scoring weights
                    </ButtonLink>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
