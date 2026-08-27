import { NextResponse } from 'next/server';
import { destroySession } from '@/server/auth/session';

/** POST /api/auth/logout */
export async function POST(): Promise<Response> {
  await destroySession();
  return NextResponse.json({ ok: true });
}
