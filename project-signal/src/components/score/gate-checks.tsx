import { cn } from '@/lib/utils';
import type { GateCheck } from '@/domain/types';

const SEVERITY_LABEL: Record<GateCheck['severity'], string> = {
  BLOCKING: 'Blocking',
  REVIEW: 'Review',
  ADVISORY: 'Advisory',
};

const SEVERITY_TONE: Record<GateCheck['severity'], string> = {
  BLOCKING: 'bg-rose-50 text-rose-800 border-rose-200',
  REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  ADVISORY: 'bg-navy-50 text-navy-600 border-navy-200',
};

/** The eight relevance-gate checks with their outcomes. */
export function GateChecks({ checks }: { checks: GateCheck[] }) {
  if (checks.length === 0) {
    return <p className="text-sm text-navy-500">This contact has not been scored yet.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {checks.map((check) => (
        <li key={check.code} className="flex gap-3 py-2.5">
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
              check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            )}
          >
            {check.passed ? '✓' : '✕'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium text-navy-800">{check.label}</p>
              {!check.passed ? (
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase', SEVERITY_TONE[check.severity])}>
                  {SEVERITY_LABEL[check.severity]}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{check.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
