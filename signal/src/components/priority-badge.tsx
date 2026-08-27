import { Priority } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { InfoTip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<Priority, { label: string; className: string; help: string }> = {
  P1: {
    label: 'P1',
    className: 'border-emerald-300 bg-emerald-600 text-white',
    help: 'Highest priority. Score 80+, role relevance 18+, data quality 7+, both gates passed, and a written justification on file.',
  },
  P2: {
    label: 'P2',
    className: 'border-blue-300 bg-blue-600 text-white',
    help: 'Medium priority. Score 60-79 with all gates passed, or a high scorer held back because role ownership, data quality, or the P1 justification is missing.',
  },
  P3: {
    label: 'P3',
    className: 'border-amber-300 bg-amber-500 text-navy-900',
    help: 'Low priority or nurture. Score 40-59 with all gates passed. Email nurture only until an engagement event arrives.',
  },
  REJECT: {
    label: 'Reject',
    className: 'border-red-300 bg-red-600 text-white',
    help: 'Inaccurate, irrelevant, duplicate, outdated, or non-compliant. Outreach is blocked.',
  },
  COMPLIANCE_HOLD: {
    label: 'Compliance hold',
    className: 'border-purple-300 bg-purple-600 text-white',
    help: 'Compliance information is incomplete. Outreach is paused until a human completes the record.',
  },
  UNSCORED: {
    label: 'Unscored',
    className: 'border-navy-200 bg-navy-100 text-navy-700',
    help: 'Not yet run through the scoring engine.',
  },
};

export function PriorityBadge({
  priority,
  className,
  withTooltip = true,
}: {
  priority: Priority;
  className?: string;
  withTooltip?: boolean;
}) {
  const style = PRIORITY_STYLES[priority];
  const badge = (
    <Badge className={cn('font-semibold', style.className, className)}>{style.label}</Badge>
  );
  if (!withTooltip) return badge;
  return <InfoTip label={style.help}>{badge}</InfoTip>;
}

export { PRIORITY_STYLES };
