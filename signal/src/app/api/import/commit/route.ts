import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiAuthError, requireApiCapability } from '@/lib/auth';
import { commitImport } from '@/lib/services/import-service';

const schema = z.object({
  fileName: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  records: z.array(z.record(z.string())).max(5000),
  mapping: z.record(z.string().nullable()),
  skipRowNumbers: z.array(z.number()).optional(),
});

/**
 * POST /api/import/commit
 * Writes the valid rows: accounts, contacts, compliance records, then campaign
 * enrolment and scoring. Returns the import summary.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireApiCapability('contact:import');
  } catch (error) {
    const authError = error as ApiAuthError;
    return NextResponse.json({ error: authError.message }, { status: authError.status ?? 500 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const summary = await commitImport({
      fileName: parsed.data.fileName,
      campaignId: parsed.data.campaignId ?? null,
      mapping: parsed.data.mapping,
      records: parsed.data.records,
      skipRowNumbers: parsed.data.skipRowNumbers,
      uploadedById: user.id,
    });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
