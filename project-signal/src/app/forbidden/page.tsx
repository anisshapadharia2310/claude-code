import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md animate-rise rounded-xl border border-line bg-surface p-8 text-center shadow-md">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-warn-50 text-warn-600">
          <Icon name="shield" className="h-6 w-6" />
        </span>

        <h1 className="text-lg font-semibold text-navy-900">You do not have access to this page</h1>

        <p className="mt-2.5 text-base leading-relaxed text-navy-600">
          {user
            ? <>You are signed in as <span className="font-medium text-navy-800">{user.name}</span> ({ROLE_LABELS[user.role]}).</>
            : 'You are not signed in.'}
        </p>

        {need ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-navy-50 px-2.5 py-1.5 text-xs text-navy-600">
            <Icon name="info" className="h-3.5 w-3.5 text-navy-400" />
            This page requires the <code className="font-mono font-semibold text-navy-800">{need}</code> permission.
          </p>
        ) : null}

        <p className="mt-4 text-sm text-navy-500">
          Ask an administrator to change your role if you need access.
        </p>

        <ButtonLink href="/" className="mt-7" block icon="dashboard">Back to the dashboard</ButtonLink>
      </div>
    </main>
  );
}
