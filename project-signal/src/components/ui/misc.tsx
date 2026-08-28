import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { cn } from '@/lib/utils';

/* ===========================================================================
   TOOLTIP
   =========================================================================== */

/**
 * A tooltip that works on the server, needs no JavaScript, and is announced by
 * screen readers. The dotted underline tells a sighted user there is more to
 * read; `aria-label` gives the same text to everyone else.
 */
export function InfoTip({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className={cn(
        'cursor-help underline decoration-navy-300 decoration-dotted underline-offset-[3px]',
        'transition-colors hover:decoration-navy-500',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A standalone help marker, for labels that should not themselves be underlined. */
export function HelpDot({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      role="img"
      className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-navy-300 text-[9px] font-bold leading-none text-navy-400 transition-colors hover:border-navy-500 hover:text-navy-600"
    >
      ?
    </span>
  );
}

/* ===========================================================================
   STRUCTURE
   =========================================================================== */

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('my-4 border-t border-line', className)} />;
}

export function PageHeader({
  title, description, actions, eyebrow, breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-6 animate-rise">
      {breadcrumb ? <div className="mb-2">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-navy-900">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-navy-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Section heading used between blocks of cards on a long page. */
export function SectionHeading({
  title, description, actions, className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-navy-800">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-navy-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ===========================================================================
   METRICS
   =========================================================================== */

const STAT_TONES = {
  default: { value: 'text-navy-900', rail: 'bg-navy-300' },
  brand: { value: 'text-brand-700', rail: 'bg-brand-600' },
  p1: { value: 'text-brand-700', rail: 'bg-brand-700' },
  p2: { value: 'text-warn-700', rail: 'bg-warn-500' },
  p3: { value: 'text-navy-600', rail: 'bg-navy-400' },
  reject: { value: 'text-danger-700', rail: 'bg-danger-500' },
  hold: { value: 'text-warn-800', rail: 'bg-warn-600' },
  success: { value: 'text-success-700', rail: 'bg-success-600' },
} as const;

export type StatTone = keyof typeof STAT_TONES;

/**
 * A KPI tile.
 *
 * Label, figure, and one line of context. The coloured rail down the left edge
 * is the only decoration, and it repeats the priority palette so a P1 count is
 * recognisable before the label is read.
 */
export function Stat({
  label, value, hint, tone = 'default', tooltip, icon, emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  tooltip?: string;
  icon?: IconName;
  /** Renders the figure larger, for the two or three headline metrics. */
  emphasis?: boolean;
}) {
  const styles = STAT_TONES[tone];
  return (
    <div
      title={tooltip}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3.5 shadow-xs',
        'transition-[box-shadow,border-color] duration-[180ms] hover:border-navy-300 hover:shadow-sm',
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', styles.rail)} />
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow leading-tight">{label}</p>
        {icon ? <Icon name={icon} className="h-4 w-4 text-navy-300" /> : null}
      </div>
      <p className={cn('tabular mt-2 font-semibold tracking-[-0.02em]', emphasis ? 'text-4xl' : 'text-3xl', styles.value)}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs leading-snug text-navy-500">{hint}</p> : null}
      {tooltip ? <span className="sr-only">{tooltip}</span> : null}
    </div>
  );
}

/** A small labelled figure, for dense stat strips inside a card. */
export function MiniStat({
  label, value, tone, className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const tones = {
    default: 'text-navy-900', success: 'text-success-700',
    warning: 'text-warn-700', danger: 'text-danger-700',
  } as const;
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-2xs font-medium uppercase tracking-[0.05em] text-navy-500">{label}</dt>
      <dd className={cn('tabular mt-0.5 text-lg font-semibold', tones[tone ?? 'default'])}>{value}</dd>
    </div>
  );
}

/* ===========================================================================
   PROGRESS
   =========================================================================== */

const PROGRESS_TONES = {
  brand: 'bg-brand-600', accent: 'bg-accent-500', success: 'bg-success-600',
  warning: 'bg-warn-500', danger: 'bg-danger-600', neutral: 'bg-navy-400',
} as const;

export function Progress({
  value, max = 100, tone = 'brand', label, size = 'md', showValue = false,
}: {
  value: number;
  max?: number;
  tone?: keyof typeof PROGRESS_TONES;
  label?: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn('w-full overflow-hidden rounded-full bg-navy-100', size === 'sm' ? 'h-1' : 'h-1.5')}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]', PROGRESS_TONES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue ? (
        <span className="tabular shrink-0 text-2xs font-medium text-navy-500">{value}/{max}</span>
      ) : null}
    </div>
  );
}

/**
 * A segmented meter, used where a value should read against a scale rather than
 * as a bare percentage.
 */
export function Meter({
  value, max, segments = 10, tone = 'brand', label,
}: {
  value: number;
  max: number;
  segments?: number;
  tone?: keyof typeof PROGRESS_TONES;
  label: string;
}) {
  const filled = max > 0 ? Math.round((value / max) * segments) : 0;
  return (
    <div className="flex items-center gap-[3px]" role="img" aria-label={`${label}: ${value} of ${max}`}>
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'h-3 w-1 rounded-full transition-colors',
            index < filled ? PROGRESS_TONES[tone] : 'bg-navy-200',
          )}
        />
      ))}
    </div>
  );
}

/* ===========================================================================
   MESSAGING
   =========================================================================== */

const ALERT_TONES = {
  info: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: 'info' as IconName, iconColor: 'text-brand-600' },
  warning: { box: 'border-warn-300 bg-warn-50 text-warn-900', icon: 'alert' as IconName, iconColor: 'text-warn-600' },
  danger: { box: 'border-danger-200 bg-danger-50 text-danger-900', icon: 'ban' as IconName, iconColor: 'text-danger-600' },
  success: { box: 'border-success-200 bg-success-50 text-success-900', icon: 'check' as IconName, iconColor: 'text-success-600' },
} as const;

/**
 * Inline feedback and system messages.
 *
 * Success and error feedback stays inline next to the control that produced it
 * rather than floating away as a toast: in an operational tool, the person needs
 * to see which action succeeded, not just that something did.
 */
export function Alert({
  tone = 'info', title, children, className, icon = true,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: boolean;
}) {
  const styles = ALERT_TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-base animate-fade-in', styles.box, className)}
    >
      {icon ? <Icon name={styles.icon} className={cn('mt-0.5 h-4 w-4 shrink-0', styles.iconColor)} strokeWidth={2} /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        {children ? <div className={cn('text-sm leading-relaxed', title && 'mt-1')}>{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title, children, icon = 'search', action,
}: {
  title: string;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-md font-semibold text-navy-800">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-base leading-relaxed text-navy-500">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
