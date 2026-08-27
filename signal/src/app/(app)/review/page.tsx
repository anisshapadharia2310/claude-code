import Link from 'next/link';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { previewScore } from '@/lib/services/scoring-service';
import { NEAR_P1_BAND, P1_SCORE_THRESHOLD } from '@/lib/domain/constants';
import { ReviewForm } from '@/components/review-form';
import { PriorityBadge } from '@/components/priority-badge';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/empty-state';
import { CampaignPicker } from '@/components/campaign-picker';
import type { ScoreLine } from '@/lib/domain/types';
import { humanize } from '@/lib/utils';

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  await requireCapability('review:perform');
  const params = await searchParams;

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  const queue = await prisma.campaignContact.findMany({
    where: {
      ...(params.campaign ? { campaignId: params.campaign } : {}),
      OR: [
        { humanReviewStatus: 'PENDING' },
        { humanReviewRequired: true, humanReviewStatus: 'NOT_REQUIRED' },
        {
          totalScore: { gte: P1_SCORE_THRESHOLD - NEAR_P1_BAND, lt: P1_SCORE_THRESHOLD },
          humanReviewStatus: { not: 'APPROVED' },
        },
      ],
    },
    include: {
      contact: { include: { account: true } },
      campaign: { select: { id: true, name: true, topic: true } },
    },
    orderBy: [{ totalScore: 'desc' }],
    take: 40,
  });

  const items = await Promise.all(
    queue.map(async (item) => ({ item, result: await previewScore(item.id) })),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Research review queue</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} contacts need a human decision before they can be worked.
          </p>
        </div>
        <CampaignPicker
          campaigns={campaigns}
          value={params.campaign ?? ''}
          basePath="/review"
          includeAll
        />
      </div>

      <Alert>
        Contacts arrive here when the role category is unknown, role confidence is low, the score is
        within {NEAR_P1_BAND} points of the P1 threshold, a trigger is unverified, company and
        contact data conflict, or compliance information is incomplete.
      </Alert>

      {items.length === 0 ? (
        <EmptyState title="The review queue is empty" description="Nothing is waiting on research." />
      ) : null}

      <div className="space-y-4">
        {items.map(({ item, result }) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    <Link href={`/contacts/${item.contactId}`} className="hover:underline">
                      {item.contact.firstName} {item.contact.lastName}
                    </Link>
                    <span className="ml-2 font-normal text-muted-foreground">
                      {item.contact.jobTitle}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {item.contact.account.companyName} &middot; {item.contact.country} &middot;{' '}
                    {item.campaign.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={result.priority} />
                  <span className="numeric text-lg font-semibold text-navy-900">
                    {result.totalScore}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {result.humanReviewReasons.map((reason) => (
                  <Badge key={reason} variant="warning">
                    {reason}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="rounded border border-navy-200 bg-navy-50 p-3 text-xs">
                    <p className="font-medium text-navy-900">Current classification</p>
                    <p className="mt-1">
                      {humanize(item.contact.roleCategory)} &middot;{' '}
                      {humanize(item.contact.seniority)} &middot; confidence{' '}
                      {humanize(item.contact.roleConfidence)}
                    </p>
                    {item.contact.roleRelevanceNotes ? (
                      <p className="mt-1 text-muted-foreground">{item.contact.roleRelevanceNotes}</p>
                    ) : null}
                    {item.contact.account.recentBusinessTrigger ? (
                      <p className="mt-2">
                        <span className="font-medium">Possible trigger: </span>
                        {item.contact.account.recentBusinessTrigger} (
                        {humanize(item.contact.account.triggerVerification)})
                      </p>
                    ) : null}
                  </div>
                  <ReviewForm
                    campaignContactId={item.id}
                    contact={{
                      roleCategory: item.contact.roleCategory,
                      roleConfidence: item.contact.roleConfidence,
                      directProblemResponsibility: item.contact.directProblemResponsibility,
                      ownsBudget: item.contact.ownsBudget,
                      influencesDecision: item.contact.influencesDecision,
                      triggerVerification: item.contact.account.triggerVerification,
                      whyThisContact: item.whyThisContact,
                    }}
                  />
                </div>

                <div className="rounded border border-navy-200 p-3">
                  <ScoreBreakdown
                    lines={result.explanation as ScoreLine[]}
                    engagementBonus={result.engagementBonus}
                    compact
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
