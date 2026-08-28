import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A tooltip built on the title attribute plus a visible dotted underline, so it
 * works on the server, needs no JavaScript, and is announced by screen readers.
 */
export function InfoTip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="cursor-help underline decoration-dotted decoration-navy-300 underline-offset-2"
    >
      {children}
    </span>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('my-4 border-t border-line', className)} />;
}

export function Progress({
  value, max = 100, tone = 'brand', label,
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tones: Record<string, string> = {
    brand: 'bg-brand-600', success: 'bg-emerald-600', warning: 'bg-amber-500',
    danger: 'bg-rose-600', neutral: 'bg-navy-400',
  };
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-all', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Alert({
  tone = 'info', title, children, className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-brand-200 bg-brand-50 text-brand-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  } as const;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-md border px-4 py-3 text-sm', tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && 'mt-1')}>{children}</div> : null}
    </div>
  );
}

export function Stat({
  label, value, hint, tone = 'default', tooltip,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'p1' | 'p2' | 'p3' | 'reject' | 'hold';
  tooltip?: string;
}) {
  const tones: Record<string, string> = {
    default: 'text-navy-900',
    p1: 'text-brand-700', p2: 'text-cyan-700', p3: 'text-navy-500',
    reject: 'text-rose-700', hold: 'text-amber-700',
  };
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3 shadow-sm" title={tooltip}>
      <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{label}</p>
      <p className={cn('tabular mt-1 text-2xl font-semibold', tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-navy-500">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-navy-900">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-navy-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-navy-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-navy-700">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm text-navy-500">{children}</div> : null}
    </div>
  );
}
