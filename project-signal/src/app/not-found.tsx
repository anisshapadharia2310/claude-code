import Link from 'next/link';
import { SignalMark } from '@/components/ui/icon';

/** The page-not-found state outside the application shell. */
export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-md">
        <SignalMark className="mx-auto mb-5 h-10 w-10" />
        <h1 className="text-lg font-semibold text-navy-900">Page not found</h1>
        <p className="mt-2.5 text-base leading-relaxed text-navy-600">
          The page you asked for does not exist.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
