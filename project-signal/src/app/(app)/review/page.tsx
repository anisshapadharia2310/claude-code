import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewForm } from '@/components/review/review-form';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScoreRing } from '@/components/score/score-ring';
import { Alert, EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { cn, formatNumber, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { can } from '@/server/auth/rbac';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { weightsFromConfig } from '@/server/services/scoring';
import { buildReviewQueue } from '@/server/services/review';

export const metadata: Metadata = { title: 'Review queue' };

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' } as const;

/** Each queue reason gets an icon so the list is scannable without reading. */
const REASON_ICON = {
  AWAITING_P1_APPROVAL: 'check', MISSING_JUSTIFICATION: 'document',
  UNKNOWN_ROLE: 'user', LOW_ROLE_CONFIDENCE: 'user', NEAR_P1: 'target',
  UNVERIFIED_TRIGGER: 'spark', CONFLICTING_DATA: 'alert', STALE_DATA: 'clock',
  KEYWORD_TRAP: 'search', COMPLIANCE_INCOMPLETE: 'compliance',
} as const;

const REASON_FILTERS: Array<[string, string]> = [
  ['AWAITING_P1_APPROVAL', 'P1 approval'],
  ['UNKNOWN_ROLE', 'Unknown role'],
  ['LOW_ROLE_CONFIDENCE', 'Low role confidence'],
  ['NEAR_P1', 'Near P1'],
  ['UNVERIFIED_TRIGGER', 'Unverified trigger'],
  ['CONFLICTING_DATA', 'Conflicting data'],
  ['COMPLIANCE_INCOMPLETE', 'Compliance incomplete'],
];

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
        eyebrow={campaign.name}
        title="Research review queue"
        description={`${formatNumber(queue.length)} contacts need a human decision before the engine can settle them. Fix the record, and the next score is right.`}
      />

      <section aria-label="Queue summary" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="In queue" value={formatNumber(queue.length)} icon="review" />
        <Stat label="High priority" value={formatNumber(counts.high)} tone="reject" icon="alert" />
        <Stat label="P1 awaiting approval" value={formatNumber(counts.awaitingApproval)} tone="p1" icon="check" />
        <Stat label="Role unclear" value={formatNumber(counts.unknownRole)} tone="p2" icon="user" />
        <Stat label="Near P1" value={formatNumber(counts.nearP1)} tone="p2" icon="target" />
        <Stat label="Unverified trigger" value={formatNumber(counts.trigger)} tone="hold" icon="spark" />
      </section>

      {/* Reason filters. Each is a link, so a filtered queue can be shared. */}
      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter the queue by reason">
        <ButtonLink href="/review" variant={reason ? 'outline' : 'primary'} size="sm">
          All reasons
        </ButtonLink>
        {REASON_FILTERS.map(([code, label]) => (
          <ButtonLink
            key={code}
            href={`/review?reason=${code}`}
            variant={reason === code ? 'primary' : 'outline'}
            size="sm"
            icon={REASON_ICON[code as keyof typeof REASON_ICON]}
          >
            {label}
          </ButtonLink>
        ))}
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Nothing is waiting for review" icon="check">
          Every contact in this campaign has either been decided by a person or settled by the engine.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* ------------------------------------------------------- queue */}
          <Card className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-hidden">
            <CardHeader
              title="Queue"
              description="Highest severity first, then by score."
              icon={<Icon name="review" className="h-4 w-4" />}
              dense
            />
            <CardBody className="max-h-[60vh] overflow-y-auto p-0 lg:max-h-[calc(100dvh-14rem)]">
              <ul className="divide-y divide-line" role="list">
                {queue.slice(0, 100).map((entry) => {
                  const row = entry.row;
                  const active = focused?.row.id === row.id;
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/review?focus=${row.id}${reason ? `&reason=${reason}` : ''}`}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'relative block px-4 py-3 transition-colors',
                          active ? 'bg-brand-50' : 'hover:bg-navy-50',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute inset-y-0 left-0 w-[3px] transition-opacity',
                            active ? 'bg-brand-600 opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-navy-900">
                              {row.contact.firstName} {row.contact.lastName}
                            </p>
                            <p className="truncate text-xs text-navy-600">{row.contact.jobTitle}</p>
                            <p className="truncate text-xs text-navy-500">{row.contact.account.companyName}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <PriorityBadge priority={row.priority} size="sm" />
                            <p className="tabular mt-1.5 text-md font-semibold text-navy-800">{row.totalScore}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.reasons.slice(0, 2).map((item) => (
                            <Badge
                              key={item.code}
                              tone={SEVERITY_TONE[item.severity]}
                              icon={REASON_ICON[item.code as keyof typeof REASON_ICON]}
                            >
                              {item.label}
                            </Badge>
                          ))}
                          {entry.reasons.length > 2 ? (
                            <Badge tone="outline">+{entry.reasons.length - 2}</Badge>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {queue.length > 100 ? (
                <p className="border-t border-line px-4 py-3 text-xs text-navy-500">
                  Showing the first 100 of {formatNumber(queue.length)}. Work through these, then reload.
                </p>
              ) : null}
            </CardBody>
          </Card>

          {/* ----------------------------------------------------- focused */}
          {focused ? (
            <div className="space-y-4">
              <Card elevation="raised">
                <CardHeader
                  title={`${focused.row.contact.firstName} ${focused.row.contact.lastName}`}
                  description={
                    <>
                      {focused.row.contact.jobTitle} at {focused.row.contact.account.companyName} ·{' '}
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
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <ScoreRing value={focused.row.totalScore} />
                    <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <dt className="eyebrow">Role relevance</dt>
                        <dd className="tabular mt-0.5 text-xl font-semibold text-navy-900">
                          {focused.row.roleRelevanceScore}<span className="text-sm font-normal text-navy-400">/25</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Trigger</dt>
                        <dd className="tabular mt-0.5 text-xl font-semibold text-navy-900">
                          {focused.row.triggerScore}<span className="text-sm font-normal text-navy-400">/20</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Data quality</dt>
                        <dd className="tabular mt-0.5 text-xl font-semibold text-navy-900">
                          {focused.row.dataQualityScore}<span className="text-sm font-normal text-navy-400">/10</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Engagement</dt>
                        <dd className="tabular mt-0.5 text-xl font-semibold text-navy-900">
                          {focused.row.engagementScore}<span className="text-sm font-normal text-navy-400">/15</span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="border-t border-line pt-4">
                    <p className="eyebrow mb-2.5">Why this contact is in the queue</p>
                    <ul className="space-y-2.5" role="list">
                      {focused.reasons.map((item) => (
                        <li key={item.code} className="flex gap-2.5">
                          <Badge
                            tone={SEVERITY_TONE[item.severity]}
                            className="mt-0.5 shrink-0"
                            icon={REASON_ICON[item.code as keyof typeof REASON_ICON]}
                          >
                            {item.label}
                          </Badge>
                          <p className="text-xs leading-relaxed text-navy-600">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-line bg-surface-sunk px-4 py-3">
                    <p className="eyebrow mb-1">Engine read the title as</p>
                    <p className="break-words font-mono text-xs text-navy-700">
                      {focused.row.contact.normalizedJobTitle || '(nothing usable)'}
                    </p>
                    {focused.row.contact.roleRelevanceNotes ? (
                      <p className="mt-2 text-xs leading-relaxed text-navy-600">
                        {focused.row.contact.roleRelevanceNotes}
                      </p>
                    ) : null}
                  </div>

                  {focused.row.contact.account.recentBusinessTrigger ? (
                    <Alert tone="warning" title="Recorded trigger">
                      {focused.row.contact.account.recentBusinessTrigger}
                      <span className="mt-1.5 block text-xs">
                        Verification: {humanize(focused.row.contact.account.triggerVerification)}
                        {focused.row.contact.account.triggerSourceUrl ? (
                          <>
                            {' · '}
                            <a
                              href={focused.row.contact.account.triggerSourceUrl}
                              className="font-medium underline underline-offset-2"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              source
                            </a>
                          </>
                        ) : ' · no source recorded'}
                      </span>
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>

              <Card accent="brand">
                <CardHeader
                  title="Researcher decision"
                  description="Corrections here change the record, then the campaign is rescored."
                  icon={<Icon name="review" className="h-4 w-4" />}
                />
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
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
