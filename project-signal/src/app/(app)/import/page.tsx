import type { Metadata } from 'next';
import { ImportWizard } from '@/components/import/import-wizard';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';
import { requirePermission } from '@/server/auth/guards';
import { getRepository } from '@/server/repo';
import { IMPORT_FIELDS } from '@/server/services/import';

export const metadata: Metadata = { title: 'Import' };

export default async function ImportPage() {
  await requirePermission('importContacts');
  const repo = await getRepository();
  const campaigns = await repo.listCampaigns();

  return (
    <>
      <PageHeader
        title="Import contacts"
        description="Upload a target account list, map the columns, fix what is wrong, then let the engine score it."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ImportWizard
          fields={IMPORT_FIELDS.map((field) => ({
            field: field.field, label: field.label, required: field.required, help: field.help,
          }))}
          campaigns={campaigns.map((campaign) => ({
            id: campaign.id, name: campaign.name, clientBrand: campaign.clientBrand,
          }))}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader title="What happens on import" />
            <CardBody>
              <ol className="space-y-2 text-xs leading-relaxed text-navy-600">
                {[
                  'Column mapping is proposed from the header names and can be corrected.',
                  'Required values are checked and rows without them are reported, not dropped silently.',
                  'Country names are normalized to a canonical market with a time zone.',
                  'Job titles are normalized: abbreviations expanded, region noise stripped.',
                  'Duplicates are detected on email, phone, company domain plus name, and company plus name - inside the file as well as against existing records.',
                  'Roles are classified from the normalized title and department, never from a keyword alone.',
                  'You choose which rows to import and which to skip.',
                  'The relevance gate, the compliance gate and the scoring engine run over the new records.',
                  'A summary is shown, and anything the engine is unsure about goes to the review queue.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="tabular shrink-0 font-semibold text-brand-700">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Required columns" />
            <CardBody>
              <ul className="space-y-1 text-xs text-navy-600">
                {IMPORT_FIELDS.filter((field) => field.required).map((field) => (
                  <li key={field.field} className="font-medium text-navy-800">{field.label}</li>
                ))}
                <li className="pt-1 text-navy-600">Work email <span className="text-navy-400">or</span> phone number</li>
              </ul>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-500">Optional</p>
              <ul className="mt-1 space-y-1 text-xs text-navy-600">
                {IMPORT_FIELDS.filter((field) => !field.required
                  && field.field !== 'workEmail' && field.field !== 'phoneNumber').map((field) => (
                  <li key={field.field}>{field.label}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
