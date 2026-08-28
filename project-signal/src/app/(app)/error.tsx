'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

/**
 * The error state for any screen inside the shell.
 *
 * States plainly what happened, offers the two things that actually help — try
 * again, or go somewhere that works — and shows the digest so a report can be
 * matched to a server log.
 */
export default function AppError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the failure in the browser console for local debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg animate-rise rounded-xl border border-line bg-surface p-8 text-center shadow-md">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <Icon name="alert" className="h-6 w-6" />
        </span>

        <h1 className="text-lg font-semibold text-navy-900">This screen could not be loaded</h1>
        <p className="mt-2.5 text-base leading-relaxed text-navy-600">
          Something failed while preparing the page. Nothing was changed, and your data is unaffected.
        </p>

        {error.digest ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-navy-50 px-2.5 py-1.5 text-xs text-navy-600">
            <Icon name="info" className="h-3.5 w-3.5 text-navy-400" />
            Reference <code className="font-mono font-semibold text-navy-800">{error.digest}</code>
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} icon="refresh">Try again</Button>
          <ButtonLink href="/" variant="outline" icon="dashboard">Back to the dashboard</ButtonLink>
        </div>
      </div>
    </div>
  );
}
