import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiAuthError, requireApiCapability } from '@/lib/auth';
import { previewImport } from '@/lib/services/import-service';

const schema = z.object({
  records: z.array(z.record(z.string())).max(5000),
  mapping: z.record(z.string().nullable()),
});

/**
 * POST /api/import/preview
 * Validates, normalises and de-duplicates the uploaded rows without writing
 * anything. Safe to call repeatedly while the user corrects rows.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiCapability('contact:import');
  } catch (error) {
    const authError = error as ApiAuthError;
    return NextResponse.json({ error: authError.message }, { status: authError.status ?? 500 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const preview = await previewImport(parsed.data.records, parsed.data.mapping);
  return NextResponse.json(preview);
}
