import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewForm } from '@/components/review/review-form';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { formatNumber, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { weightsFromConfig } from '@/server/services/scoring';
import { buildReviewQueue } from '@/server/services/review';

export const metadata: Metadata = { title: 'Review queue' };

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' } as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; reason?: string }>;
}) {
  const user = await requirePermission('reviewContacts');
  const campaign = await getSelectedCampaign();
  if (!campaign) return <EmptyState title="No campaigns yet" />;

  const { focus, reason } = await searchParams;
  const repo = await getRepository();
  const [links, config] = await Promise.all([
    repo.listCampaignContacts(campaign.id),
    repo.getScoringConfig(campaign.id),
  ]);

  const weights = weightsFromConfig(config);
  let queue = buildReviewQueue(links, weights.thresholds.p1);
  if (reason) queue = queue.filter((entry) => entry.reasons.some((item) => item.code === reason));

  const focused = focus
    ? queue.find((entry) => entry.row.id === focus) ?? null
    : queue[0] ?? null;

  const counts = {
    high: queue.filter((entry) => entry.rank === 0).length,
    awaitingApproval: queue.filter((entry) => entry.reasons.some((r) => r.code === 'AWAITING_P1_APPROVAL')).length,
    unknownRole: queue.filter((entry) => entry.reasons.some((r) => r.code === 'UNKNOWN_ROLE' || r.code === 'LOW_ROLE_CONFIDENCE')).length,
    nearP1: queue.filter((entry) => entry.reasons.some((r) => r.code === 'NEAR_P1')).length,
    trigger: queue.filter((entry) => entry.reasons.some((r) => r.code === 'UNVERIFIED_TRIGGER')).length,
    conflict: queue.filter((entry) => entry.reasons.some((r) => r.code === 'CONFLICTING_DATA')).length,
  };

  return (
    <>
      <PageHeader
        title="Research review queue"
        description={`${formatNumber(queue.length)} contacts in ${campaign.name} need a human decision before the engine can settle them.`}
      />

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="In queue" value={formatNumber(queue.length)} />
        <Stat label="High priority" value={formatNumber(counts.high)} tone="reject" />
        <Stat label="P1 awaiting approval" value={formatNumber(counts.awaitingApproval)} tone="p1" />
        <Stat label="Role unclear" value={formatNumber(counts.unknownRole)} />
        <Stat label="Near P1" value={formatNumber(counts.nearP1)} tone="p2" />
        <Stat label="Unverified trigger" value={formatNumber(counts.trigger)} tone="hold" />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonLink href="/review" variant={reason ? 'outline' : 'primary'} size="sm">All reasons</ButtonLink>
        {[
          ['AWAITING_P1_APPROVAL', 'P1 approval'],
          ['UNKNOWN_ROLE', 'Unknown role'],
          ['LOW_ROLE_CONFIDENCE', 'Low role confidence'],
          ['NEAR_P1', 'Near P1'],
          ['UNVERIFIED_TRIGGER', 'Unverified trigger'],
          ['CONFLICTING_DATA', 'Conflicting data'],
          ['COMPLIANCE_INCOMPLETE', 'Compliance incomplete'],
        ].map(([code, label]) => (
          <ButtonLink key={code} href={`/review?reason=${code}`} variant={reason === code ? 'primary' : 'outline'} size="sm">
            {label}
          </ButtonLink>
        ))}
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Nothing is waiting for review">
          Every contact in this campaign has either been decided by a person or settled by the engine.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="max-h-[70vh] overflow-y-auto">
            <CardHeader title="Queue" description="Highest severity first, then by score." />
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {queue.slice(0, 100).map((entry) => {
                  const row = entry.row;
                  const active = focused?.row.id === row.id;
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/review?focus=${row.id}${reason ? `&reason=${reason}` : ''}`}
                        className={`block px-4 py-3 hover:bg-brand-50 ${active ? 'border-l-2 border-brand-600 bg-brand-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy-800">
                              {row.contact.firstName} {row.contact.lastName}
                            </p>
                            <p className="truncate text-xs text-navy-500">{row.contact.jobTitle}</p>
                            <p className="truncate text-xs text-navy-500">{row.contact.account.companyName}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <PriorityBadge priority={row.priority} />
                            <p className="tabular mt-1 text-sm font-semibold text-navy-800">{row.totalScore}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.reasons.slice(0, 2).map((item) => (
                            <Badge key={item.code} tone={SEVERITY_TONE[item.severity]} className="text-[10px]">
                              {item.label}
                            </Badge>
                          ))}
                          {entry.reasons.length > 2 ? (
                            <Badge tone="neutral" className="text-[10px]">+{entry.reasons.length - 2}</Badge>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {queue.length > 100 ? (
                <p className="px-4 py-3 text-xs text-navy-500">
                  Showing the first 100 of {formatNumber(queue.length)}. Work through these, then reload.
                </p>
              ) : null}
            </CardBody>
          </Card>

          {focused ? (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  title={`${focused.row.contact.firstName} ${focused.row.contact.lastName}`}
                  description={
                    <>
                      {focused.row.contact.jobTitle} at {focused.row.contact.account.companyName} &middot;{' '}
                      {focused.row.contact.country}
                    </>
                  }
                  actions={
                    <>
                      <PriorityBadge priority={focused.row.priority} />
                      <ButtonLink href={`/contacts/${focused.row.id}`} variant="outline" size="sm">
                        Full record
                      </ButtonLink>
                    </>
                  }
                />
                <CardBody className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
                      Why this contact is in the queue
                    </p>
                    <ul className="space-y-2">
                      {focused.reasons.map((item) => (
                        <li key={item.code} className="flex gap-2">
                          <Badge tone={SEVERITY_TONE[item.severity]} className="mt-0.5 shrink-0 text-[10px]">
                            {item.label}
                          </Badge>
                          <p className="text-xs leading-relaxed text-navy-600">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs sm:grid-cols-4">
                    <div><dt className="text-navy-500">Total</dt><dd className="tabular text-lg font-semibold text-navy-900">{focused.row.totalScore}</dd></div>
                    <div><dt className="text-navy-500">Role relevance</dt><dd className="tabular text-lg font-semibold text-navy-900">{focused.row.roleRelevanceScore}<span className="text-xs font-normal text-navy-400">/25</span></dd></div>
                    <div><dt className="text-navy-500">Trigger</dt><dd className="tabular text-lg font-semibold text-navy-900">{focused.row.triggerScore}<span className="text-xs font-normal text-navy-400">/20</span></dd></div>
                    <div><dt className="text-navy-500">Data quality</dt><dd className="tabular text-lg font-semibold text-navy-900">{focused.row.dataQualityScore}<span className="text-xs font-normal text-navy-400">/10</span></dd></div>
                  </dl>

                  <div className="rounded border border-line bg-navy-50 px-3 py-2 text-xs">
                    <p className="font-medium text-navy-700">Engine read the title as:</p>
                    <p className="font-mono text-navy-600">{focused.row.contact.normalizedJobTitle || '(nothing usable)'}</p>
                    {focused.row.contact.roleRelevanceNotes ? (
                      <p className="mt-1 leading-relaxed text-navy-600">{focused.row.contact.roleRelevanceNotes}</p>
                    ) : null}
                  </div>

                  {focused.row.contact.account.recentBusinessTrigger ? (
                    <Alert tone="warning">
                      <span className="font-semibold">Recorded trigger: </span>
                      {focused.row.contact.account.recentBusinessTrigger}
                      <span className="mt-1 block text-xs">
                        Verification: {humanize(focused.row.contact.account.triggerVerification)}
                        {focused.row.contact.account.triggerSourceUrl
                          ? <> &middot; <a href={focused.row.contact.account.triggerSourceUrl} className="underline" rel="noreferrer noopener" target="_blank">source</a></>
                          : ' · no source recorded'}
                      </span>
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Researcher decision" description="Corrections here change the record, then the campaign is rescored." />
                <CardBody>
                  <ReviewForm
                    campaignContactId={focused.row.id}
                    canApprove={can(user.role, 'approveP1')}
                    contact={{
                      roleCategory: focused.row.contact.roleCategory,
                      roleConfidence: focused.row.contact.roleConfidence,
                      directProblemResponsibility: focused.row.contact.directProblemResponsibility,
                      ownsBudget: focused.row.contact.ownsBudget,
                      influencesDecision: focused.row.contact.influencesDecision,
                      roleRelevanceNotes: focused.row.contact.roleRelevanceNotes,
                      triggerVerification: focused.row.contact.account.triggerVerification,
                      whyThisContact: focused.row.whyThisContact,
                      whyThisContactDraft: focused.row.whyThisContactDraft,
                      reviewNotes: focused.row.reviewNotes,
                      priority: focused.row.priority,
                    }}
                  />
                  {!can(user.role, 'approveP1') ? (
                    <p className="mt-3 text-xs text-navy-500">
                      Approving a P1 is a manager decision. Save your notes and the justification, and a manager
                      will approve it.
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
