import type { ComplianceGateResult, GateCheck, RelevanceGateResult } from '@/lib/domain/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function CheckRow({ check }: { check: GateCheck }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
          check.passed ? 'bg-emerald-600' : 'bg-red-600',
        )}
      >
        {check.passed ? '✓' : '✕'}
      </span>
      <span className="flex-1 text-xs">
        <span className={cn('font-medium', check.passed ? 'text-navy-900' : 'text-red-800')}>
          {check.label}
        </span>
        <span className="sr-only">{check.passed ? ' passed' : ' failed'}</span>
        <span className="mt-0.5 block leading-snug text-muted-foreground">{check.detail}</span>
      </span>
    </li>
  );
}

export function RelevanceGatePanel({ result }: { result: RelevanceGateResult }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-900">Relevance gate</h4>
        <Badge variant={result.passed ? 'success' : 'danger'}>
          {result.passed ? 'Passed' : `${result.failures.length} failed`}
        </Badge>
      </div>
      <ul className="divide-y divide-navy-100">
        {result.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </ul>
      {!result.roleEligibleForP1 ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          This contact cannot reach P1: the role is neither a direct nor an indirect owner of the
          campaign problem.
        </p>
      ) : null}
    </div>
  );
}

export function ComplianceGatePanel({ result }: { result: ComplianceGateResult }) {
  const tone =
    result.outcome === 'PASS' ? 'success' : result.outcome === 'HOLD' ? 'warning' : 'danger';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-900">Compliance gate</h4>
        <Badge variant={tone}>{result.outcome}</Badge>
      </div>
      <ul className="divide-y divide-navy-100">
        {result.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </ul>
      <div className="mt-3 space-y-1">
        {result.permissions.map((permission) => (
          <div
            key={permission.channel}
            className={cn(
              'flex items-start gap-2 rounded px-2 py-1.5 text-[11px]',
              permission.allowed ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900',
            )}
          >
            <span className="w-20 shrink-0 font-semibold">{permission.channel}</span>
            <span className="flex-1 leading-snug">{permission.reason}</span>
            {permission.requiresReview ? <Badge variant="warning">Review</Badge> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
