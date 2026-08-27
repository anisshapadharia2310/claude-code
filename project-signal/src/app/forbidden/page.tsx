import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { getSessionUser } from '@/server/auth/session';
import { ROLE_LABELS } from '@/server/auth/rbac';

export const metadata: Metadata = { title: 'Not permitted' };

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { need } = await searchParams;
  const user = await getSessionUser();

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md rounded-lg border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-navy-900">You do not have access to this page</h1>
        <p className="mt-2 text-sm text-navy-600">
          {user
            ? `You are signed in as ${user.name} (${ROLE_LABELS[user.role]}).`
            : 'You are not signed in.'}
          {need ? ` This page requires the "${need}" permission.` : ''}
        </p>
        <p className="mt-2 text-sm text-navy-500">
          Ask an administrator to change your role if you need access.
        </p>
        <ButtonLink href="/" className="mt-6">Back to the dashboard</ButtonLink>
      </div>
    </main>
  );
}
