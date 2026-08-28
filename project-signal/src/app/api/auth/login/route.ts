import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate, createSession } from '@/server/auth/session';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

/** POST /api/auth/login - session cookie sign-in for non-browser clients. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload.' }, { status: 422 });

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok || !result.user) {
    return NextResponse.json({ error: result.error ?? 'Sign-in failed.' }, { status: 401 });
  }

  await createSession(result.user.id);
  return NextResponse.json({
    ok: true,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
  });
}
