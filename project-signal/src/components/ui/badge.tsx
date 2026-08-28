import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import type { Priority } from '@prisma/client';
import { Icon, type IconName } from './icon';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-md border font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-line-strong bg-navy-50 text-navy-700',
        brand: 'border-brand-200 bg-brand-50 text-brand-800',
        info: 'border-accent-200 bg-accent-50 text-accent-800',
        success: 'border-success-200 bg-success-50 text-success-800',
        warning: 'border-warn-200 bg-warn-50 text-warn-800',
        danger: 'border-danger-200 bg-danger-50 text-danger-800',
        solid: 'border-transparent bg-navy-800 text-white',
        outline: 'border-line-strong bg-transparent text-navy-600',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-2xs',
        md: 'px-2 py-1 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement>
  & VariantProps<typeof badgeVariants>
  & { icon?: IconName; dot?: boolean };

export function Badge({ className, tone, size, icon, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" /> : null}
      {icon ? <Icon name={icon} className="h-3 w-3" strokeWidth={2} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ===========================================================================
   PRIORITY
   ---------------------------------------------------------------------------
   Each band gets three independent cues — colour, an icon shape, and a written
   label — so the system is readable without colour vision, in greyscale, and
   at a glance across a dense table.

   P1 is the only band that is filled: it is the only band a caller works first.
   =========================================================================== */

interface PriorityStyle {
  label: string;
  /** Longer form used by screen readers and tooltips. */
  meaning: string;
  chip: string;
  marker: ReactNode;
  bar: string;
}

const PRIORITY_STYLES: Record<Priority, PriorityStyle> = {
  P1: {
    label: 'P1',
    meaning: 'Highest priority: confirmed problem ownership, live trigger, verified data, all gates passed.',
    chip: 'border-transparent bg-brand-700 text-white shadow-xs',
    marker: <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />,
    bar: 'bg-brand-700',
  },
  P2: {
    label: 'P2',
    meaning: 'Medium priority: qualifies on fit and role but is short of the P1 bar.',
    chip: 'border-warn-300 bg-warn-50 text-warn-800',
    marker: <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warn-500" />,
    bar: 'bg-warn-500',
  },
  P3: {
    label: 'P3',
    meaning: 'Low priority or nurture: relevant, but no live trigger or intent yet.',
    chip: 'border-line-strong bg-navy-50 text-navy-600',
    marker: <span aria-hidden="true" className="h-2 w-2 rounded-full bg-navy-400" />,
    bar: 'bg-navy-400',
  },
  REJECT: {
    label: 'Reject',
    meaning: 'Rejected: irrelevant, duplicate, outdated or non-compliant.',
    chip: 'border-danger-200 bg-danger-50 text-danger-700',
    marker: <Icon name="ban" className="h-3 w-3" strokeWidth={2} />,
    bar: 'bg-danger-500',
  },
  COMPLIANCE_HOLD: {
    label: 'Hold',
    meaning: 'Compliance hold: outreach is blocked until the compliance record is completed.',
    chip: 'border-warn-400 bg-warn-100 text-warn-900',
    marker: <Icon name="alert" className="h-3 w-3" strokeWidth={2} />,
    bar: 'bg-warn-600',
  },
  UNSCORED: {
    label: 'Unscored',
    meaning: 'Not yet processed by the scoring engine.',
    chip: 'border-dashed border-navy-300 bg-transparent text-navy-500',
    marker: <span aria-hidden="true" className="h-2 w-2 rounded-full border border-navy-400" />,
    bar: 'bg-navy-200',
  },
};

export function priorityMeaning(priority: Priority): string {
  return PRIORITY_STYLES[priority].meaning;
}

/** The colour a band uses everywhere else in the product (charts, rails). */
export function priorityBarClass(priority: Priority): string {
  return PRIORITY_STYLES[priority].bar;
}

export function PriorityBadge({
  priority, pending, className, size = 'md',
}: {
  priority: Priority;
  /** A P1 that still needs a justification or a manager approval. */
  pending?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const style = PRIORITY_STYLES[priority];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        title={pending ? `${style.meaning} Awaiting manager approval.` : style.meaning}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-semibold leading-none tracking-tight',
          size === 'sm' ? 'px-1.5 py-1 text-2xs' : 'px-2 py-1 text-xs',
          style.chip,
          className,
        )}
      >
        {style.marker}
        {style.label}
        <span className="sr-only"> — {style.meaning}</span>
      </span>
      {pending ? (
        <span
          title="Scored P1 by the engine. A written justification and a manager approval are still required."
          className="inline-flex items-center gap-1 rounded-md border border-warn-300 bg-warn-50 px-1.5 py-1 text-2xs font-medium leading-none text-warn-800"
        >
          <Icon name="clock" className="h-3 w-3" strokeWidth={2} />
          Pending
        </span>
      ) : null}
    </span>
  );
}

/** A compact status pill for outreach state, email state and the like. */
export function StatusDot({
  tone, label, className,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  label: string;
  className?: string;
}) {
  const tones = {
    neutral: 'bg-navy-300',
    success: 'bg-success-500',
    warning: 'bg-warn-500',
    danger: 'bg-danger-500',
    info: 'bg-accent-500',
  } as const;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-navy-600', className)}>
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tones[tone])} />
      {label}
    </span>
  );
}
