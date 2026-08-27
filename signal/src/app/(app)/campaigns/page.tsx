import Link from 'next/link';
import { Priority } from '@prisma/client';
import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, humanize } from '@/lib/utils';

export default async function CampaignsPage() {
  await requireCapability('campaign:view');

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { campaignContacts: true } },
      campaignContacts: { select: { priority: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Each campaign defines its own targeting, its own definition of a relevant role, and its own
          scoring weights.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((campaign) => {
          const count = (priority: Priority) =>
            campaign.campaignContacts.filter((c) => c.priority === priority).length;
          return (
            <Card key={campaign.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>
                    <Link href={`/campaigns/${campaign.id}`} className="hover:underline">
                      {campaign.name}
                    </Link>
                  </CardTitle>
                  <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'muted'}>
                    {humanize(campaign.status)}
                  </Badge>
                </div>
                <CardDescription>
                  {campaign.clientBrand} &middot; {humanize(campaign.campaignType)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-navy-800">{campaign.targetBusinessProblem}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success">P1 {count(Priority.P1)}</Badge>
                  <Badge variant="info">P2 {count(Priority.P2)}</Badge>
                  <Badge variant="warning">P3 {count(Priority.P3)}</Badge>
                  <Badge variant="danger">Reject {count(Priority.REJECT)}</Badge>
                  <Badge variant="muted">Hold {count(Priority.COMPLIANCE_HOLD)}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Enrolled</dt>
                    <dd className="numeric font-medium">{campaign._count.campaignContacts}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {campaign.campaignType === 'WEBINAR' ? 'Event date' : 'Published'}
                    </dt>
                    <dd className="font-medium">
                      {campaign.eventDate ? formatDate(campaign.eventDate) : 'On demand'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Campaign cost</dt>
                    <dd className="numeric font-medium">
                      {formatCurrency(campaign.campaignCost ? Number(campaign.campaignCost) : null, campaign.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Weights</dt>
                    <dd className="font-medium">{campaign.scoringWeights ? 'Custom' : 'Default 100-point'}</dd>
                  </div>
                </dl>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="inline-block text-sm font-medium text-primary hover:underline"
                >
                  Configure and analyse &rarr;
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
