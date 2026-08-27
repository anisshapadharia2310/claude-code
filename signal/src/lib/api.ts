import { NextResponse } from 'next/server';
import { ApiAuthError } from './auth';

/** Uniform error envelope for every API route. */
export function apiError(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  return NextResponse.json({ error: message }, { status: 500 });
}
