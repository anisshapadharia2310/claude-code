import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Icon, SignalMark } from '@/components/ui/icon';
import { getSessionUser } from '@/server/auth/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

const BANDS = [
  { label: 'P1', dot: 'bg-brand-400', detail: 'Confirmed owner, live trigger, verified data, all gates passed' },
  { label: 'P2', dot: 'bg-warn-400', detail: 'Qualifies on fit and role, short of the P1 bar' },
  { label: 'P3', dot: 'bg-navy-400', detail: 'Relevant but no live trigger: nurture' },
  { label: 'Reject', dot: 'bg-danger-400', detail: 'Irrelevant, duplicate, outdated or non-compliant' },
];

const PILLARS = [
  { icon: 'building' as const, label: 'Company fit' },
  { icon: 'user' as const, label: 'Role ownership' },
  { icon: 'spark' as const, label: 'Business triggers' },
  { icon: 'trendUp' as const, label: 'Intent' },
  { icon: 'shield' as const, label: 'Data quality' },
  { icon: 'compliance' as const, label: 'Compliance' },
];

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <main id="main-content" className="flex min-h-dvh flex-col lg:flex-row">
      {/* ------------------------------------------------------- brand panel */}
      <section className="surface-command relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-14 text-white lg:px-16 lg:py-16">
        {/* A quiet grid, suggesting structured data behind the product. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative max-w-lg animate-rise">
          <div className="flex items-center gap-3">
            <SignalMark className="h-11 w-11" />
            <div>
              <p className="text-2xl font-semibold tracking-[-0.02em]">SIGNAL</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-300">
                Revenue Intelligence
              </p>
            </div>
          </div>

          <h1 className="mt-10 text-3xl font-semibold leading-tight tracking-[-0.025em] text-white">
            A job title is evidence,
            <br />
            <span className="text-accent-300">not qualification.</span>
          </h1>

          <p className="mt-5 max-w-md text-md leading-relaxed text-navy-200">
            SIGNAL scores every contact on company fit, confirmed problem ownership, live business triggers,
            demonstrated intent, data quality and communication permission &mdash; and explains every point it
            awards.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2" role="list">
            {PILLARS.map((pillar) => (
              <li
                key={pillar.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-navy-200"
              >
                <Icon name={pillar.icon} className="h-3.5 w-3.5 text-accent-300" />
                {pillar.label}
              </li>
            ))}
          </ul>

          <dl className="mt-9 grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
            {BANDS.map((band) => (
              <div
                key={band.label}
                className="rounded-lg border border-white/8 bg-white/[0.04] px-3.5 py-2.5 backdrop-blur-sm"
              >
                <dt className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${band.dot}`} />
                  {band.label}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-navy-300">{band.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* -------------------------------------------------------- sign-in */}
      <section className="flex w-full items-center justify-center bg-canvas px-6 py-12 lg:w-[480px] lg:shrink-0 lg:px-12">
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-navy-900">Sign in</h2>
          <p className="mt-1.5 text-base text-navy-500">Use one of the seeded demo accounts.</p>

          <LoginForm />

          <div className="mt-8 rounded-xl border border-line bg-surface p-4 shadow-xs">
            <p className="eyebrow mb-2.5">Demo accounts</p>
            <ul className="space-y-2" role="list">
              {[
                ['admin@signal.agency', 'Admin', 'bg-brand-600'],
                ['manager@signal.agency', 'Manager', 'bg-accent-600'],
                ['researcher@signal.agency', 'Researcher', 'bg-success-600'],
                ['caller@signal.agency', 'Caller', 'bg-navy-600'],
              ].map(([email, role, tone]) => (
                <li key={email} className="flex items-center justify-between gap-2 text-xs">
                  <code className="truncate font-mono text-navy-700">{email}</code>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white ${tone}`}>
                    {role}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-xs text-navy-500">
              Password for all seeded accounts: <code className="font-mono font-semibold text-navy-700">signal123</code>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
