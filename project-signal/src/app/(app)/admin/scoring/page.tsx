import type { Metadata } from 'next';
import { WeightsEditor } from '@/components/admin/weights-editor';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, PageHeader } from '@/components/ui/misc';
import { COMPONENTS_BY_BAND } from '@/domain/weights';
import { SCORE_BAND_LABELS } from '@/domain/types';
import { requirePermission } from '@/server/auth/guards';
import { getSelectedCampaign } from '@/server/campaign-context';
import { getRepository } from '@/server/repo';
import { weightsFromConfig } from '@/server/services/scoring';
import type { ScoreBand } from '@/domain/types';

export const metadata: Metadata = { title: 'Scoring rules' };

const BANDS: ScoreBand[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export default async function ScoringPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>;
}) {
  await requirePermission('editScoringWeights');
  const { campaignId } = await searchParams;

  const repo = await getRepository();
  const campaigns = await repo.listCampaigns();
  const selected = campaignId
    ? campaigns.find((campaign) => campaign.id === campaignId) ?? null
    : await getSelectedCampaign();

  if (!selected) {
    return <Alert tone="warning">No campaign is selected.</Alert>;
  }

  const config = await repo.getScoringConfig(selected.id);
  const weights = weightsFromConfig(config);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Scoring rules"
        description={`Weights for ${selected.clientBrand} — ${selected.name}. Saving rescores the whole campaign and writes an audit entry per changed contact.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {campaigns.map((campaign) => (
              <ButtonLink
                key={campaign.id}
                href={`/admin/scoring?campaignId=${campaign.id}`}
                variant={campaign.id === selected.id ? 'primary' : 'outline'}
                size="sm"
              >
                {campaign.clientBrand}
              </ButtonLink>
            ))}
          </div>
        }
      />

      <Alert tone="info" className="mb-4" title="What these numbers do">
        The engine awards each component up to the points set here and caps each band at the sum of its own
        components. The six band totals must add up to 100. Post-event engagement is added on top of the base
        score and the combined total is capped at 100, so a contact who attends everything cannot outrank the
        model.
      </Alert>

      <WeightsEditor
        campaignId={selected.id}
        campaignName={selected.name}
        thresholds={weights.thresholds}
        bands={BANDS.map((band) => ({
          band,
          label: SCORE_BAND_LABELS[band],
          components: COMPONENTS_BY_BAND[band].map((component) => ({
            code: component.code,
            band: component.band,
            label: component.label,
            description: component.description,
            points: weights.componentMax[component.code] ?? component.defaultPoints,
          })),
        }))}
      />

      <Card className="mt-4" accent="danger">
        <CardHeader
          title="Rules the weights cannot change"
          description="Structural guarantees. No weight configuration can switch these off."
        />
        <CardBody>
          <ul className="space-y-2.5 text-base leading-relaxed text-navy-700">
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />A contact who fails a blocking relevance check is rejected regardless of score.</li>
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />A contact who is opted out, marked do-not-contact, or a duplicate is rejected regardless of score.</li>
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />Incomplete compliance information produces a compliance hold, not a priority.</li>
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />A P1 requires a written &ldquo;why this contact&rdquo; justification and a manager approval.</li>
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />The account-level signal is displayed separately and never changes a contact score.</li>
            <li className="flex gap-2.5"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />Every score change is written to an append-only audit trail.</li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
