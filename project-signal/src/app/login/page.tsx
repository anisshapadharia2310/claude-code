import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-dvh flex-col bg-navy-900 lg:flex-row">
      <section className="flex flex-1 flex-col justify-center px-6 py-12 text-white lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Project</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">SIGNAL</h1>
        <p className="mt-1 text-sm text-navy-200">
          Scored Intent and Granular Account-Level Listbuilding
        </p>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-navy-200">
          A job title is evidence, not qualification. SIGNAL scores every contact on company fit,
          confirmed problem ownership, live business triggers, demonstrated intent, data quality
          and communication permission &mdash; and explains every point it awards.
        </p>
        <dl className="mt-8 grid max-w-md grid-cols-2 gap-4 text-sm">
          {[
            ['P1', 'Confirmed owner, live trigger, verified data, all gates passed'],
            ['P2', 'Qualifies on fit and role, short of the P1 bar'],
            ['P3', 'Relevant but no live trigger: nurture'],
            ['Reject', 'Irrelevant, duplicate, outdated or non-compliant'],
          ].map(([term, detail]) => (
            <div key={term} className="rounded-md border border-navy-700 bg-navy-800/60 px-3 py-2">
              <dt className="font-semibold text-brand-200">{term}</dt>
              <dd className="mt-0.5 text-xs text-navy-300">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex w-full items-center justify-center bg-canvas px-6 py-12 lg:w-[480px] lg:px-10">
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold text-navy-900">Sign in</h2>
          <p className="mt-1 text-sm text-navy-500">Use one of the seeded demo accounts.</p>
          <LoginForm />
          <div className="mt-8 rounded-md border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Demo accounts</p>
            <ul className="mt-2 space-y-1 text-xs text-navy-600">
              <li><code className="font-mono">admin@signal.agency</code> &mdash; Admin</li>
              <li><code className="font-mono">manager@signal.agency</code> &mdash; Manager</li>
              <li><code className="font-mono">researcher@signal.agency</code> &mdash; Researcher</li>
              <li><code className="font-mono">caller@signal.agency</code> &mdash; Caller</li>
            </ul>
            <p className="mt-2 text-xs text-navy-500">
              Password for all seeded accounts: <code className="font-mono">signal123</code>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
