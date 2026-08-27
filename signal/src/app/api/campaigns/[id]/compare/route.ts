import { NextResponse } from 'next/server';
import { requireApiCapability } from '@/lib/auth';
import { compareMethods } from '@/lib/services/analytics-service';
import { apiError } from '@/lib/api';

/** GET /api/campaigns/:id/compare - surface-level list versus SIGNAL list. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiCapability('dashboard:view');
    const { id } = await params;
    return NextResponse.json(await compareMethods(id));
  } catch (error) {
    return apiError(error);
  }
}
