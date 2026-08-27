import { requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ImportWizard } from '@/components/import-wizard';
import { Alert } from '@/components/ui/alert';

export default async function ImportPage() {
  await requireCapability('contact:import');
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Import contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload, map, validate, correct, then import. Nothing is written to the database until you
          confirm the final step.
        </p>
      </div>

      <Alert>
        Imported contacts start with their role ownership unconfirmed. The engine will not award
        ownership points, and will not promote anyone to P1, until a researcher verifies who actually
        owns the campaign problem.
      </Alert>

      <ImportWizard campaigns={campaigns} />
    </div>
  );
}
