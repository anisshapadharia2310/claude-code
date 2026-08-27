import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { Priority } from '@prisma/client';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'border-navy-200 bg-navy-50 text-navy-700',
        brand: 'border-brand-200 bg-brand-50 text-brand-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-rose-200 bg-rose-50 text-rose-800',
        info: 'border-cyan-200 bg-cyan-50 text-cyan-800',
        solid: 'border-transparent bg-navy-800 text-white',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const PRIORITY_STYLES: Record<Priority, { label: string; className: string; title: string }> = {
  P1: {
    label: 'P1',
    className: 'border-brand-700 bg-brand-700 text-white',
    title: 'Highest priority: strong fit, confirmed problem ownership, live trigger, all gates passed.',
  },
  P2: {
    label: 'P2',
    className: 'border-cyan-600 bg-cyan-600 text-white',
    title: 'Medium priority: qualifies on fit and role but is short of the P1 bar.',
  },
  P3: {
    label: 'P3',
    className: 'border-navy-300 bg-navy-100 text-navy-700',
    title: 'Low priority or nurture: relevant, but no live trigger or intent yet.',
  },
  REJECT: {
    label: 'Reject',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
    title: 'Rejected: irrelevant, duplicate, outdated or non-compliant.',
  },
  COMPLIANCE_HOLD: {
    label: 'Compliance hold',
    className: 'border-amber-300 bg-amber-50 text-amber-900',
    title: 'Outreach blocked until the compliance record is completed.',
  },
  UNSCORED: {
    label: 'Unscored',
    className: 'border-dashed border-navy-300 bg-white text-navy-500',
    title: 'Not yet processed by the scoring engine.',
  },
};

export function PriorityBadge({
  priority, pending, className,
}: {
  priority: Priority;
  /** True for a P1 that is still waiting on a written justification or approval. */
  pending?: boolean;
  className?: string;
}) {
  const style = PRIORITY_STYLES[priority];
  return (
    <span
      title={pending ? `${style.title} Awaiting manager approval.` : style.title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        style.className,
        className,
      )}
    >
      {style.label}
      {pending ? <span aria-label="pending approval" title="Awaiting approval">&#183; pending</span> : null}
    </span>
  );
}
