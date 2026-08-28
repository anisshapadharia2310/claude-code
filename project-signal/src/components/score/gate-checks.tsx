import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { GateCheck } from '@/domain/types';

/**
 * The relevance-gate result.
 *
 * Grouped by severity so the reader sees the blocking failures first, and each
 * outcome carries an icon as well as a colour: a failed blocking check must be
 * unmistakable in greyscale.
 */
const SEVERITY = {
  BLOCKING: {
    label: 'Blocking',
    chip: 'border-danger-200 bg-danger-50 text-danger-700',
    note: 'A failure here rejects the contact outright, whatever the score.',
  },
  REVIEW: {
    label: 'Review',
    chip: 'border-warn-200 bg-warn-50 text-warn-800',
    note: 'A failure here keeps the contact workable but locks P1 until a person resolves it.',
  },
  ADVISORY: {
    label: 'Advisory',
    chip: 'border-line-strong bg-navy-50 text-navy-600',
    note: 'Noted for context. No effect on the priority.',
  },
} as const;

export function GateChecks({ checks }: { checks: GateCheck[] }) {
  if (checks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-navy-500">
        This contact has not been scored yet.
      </p>
    );
  }

  const passed = checks.filter((check) => check.passed).length;
  const failedBlocking = checks.filter((check) => !check.passed && check.severity === 'BLOCKING').length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
            failedBlocking > 0
              ? 'border-danger-200 bg-danger-50 text-danger-700'
              : 'border-success-200 bg-success-50 text-success-800',
          )}
        >
          <Icon name={failedBlocking > 0 ? 'ban' : 'check'} className="h-3.5 w-3.5" strokeWidth={2.25} />
          {failedBlocking > 0
            ? `${failedBlocking} blocking failure${failedBlocking === 1 ? '' : 's'}`
            : 'All blocking checks passed'}
        </span>
        <span className="tabular text-xs text-navy-500">{passed} of {checks.length} checks passed</span>
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {checks.map((check) => {
          const severity = SEVERITY[check.severity];
          return (
            <li
              key={check.code}
              className={cn('flex gap-3 px-4 py-3', !check.passed && check.severity === 'BLOCKING' && 'bg-danger-50/40')}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  check.passed ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700',
                )}
              >
                <Icon name={check.passed ? 'check' : 'close'} className="h-3 w-3" strokeWidth={3} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium text-navy-800">{check.label}</p>
                  <span className="sr-only">{check.passed ? 'passed' : 'failed'}.</span>
                  {!check.passed ? (
                    <span
                      title={severity.note}
                      className={cn('rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.05em]', severity.chip)}
                    >
                      {severity.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-navy-500">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
