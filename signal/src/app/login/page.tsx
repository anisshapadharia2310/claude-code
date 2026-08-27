import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold tracking-tight text-white">
            SIGNAL
          </p>
          <p className="mt-1 text-xs text-navy-300">
            Scored Intent and Granular Account-Level Listbuilding
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 rounded-lg border border-navy-700 bg-navy-800/60 p-3 text-[11px] leading-relaxed text-navy-200">
          <p className="mb-1 font-semibold text-navy-100">Demo accounts (password: signal123)</p>
          <p>admin@signal.example - manages campaigns, weights, compliance and users</p>
          <p>manager@signal.example - dashboards, P1 approval, exports</p>
          <p>researcher@signal.example - import, enrichment, review queue</p>
          <p>caller@signal.example - assigned worklist and call outcomes</p>
        </div>
      </div>
    </main>
  );
}
