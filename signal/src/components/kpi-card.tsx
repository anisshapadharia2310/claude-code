import { Card, CardContent } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  hint,
  help,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  help?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    default: 'text-navy-900',
    good: 'text-emerald-700',
    warn: 'text-amber-600',
    bad: 'text-red-700',
  }[tone];

  return (
    <Card>
      <CardContent className="p-4 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {help ? <InfoTip label={help}>{label}</InfoTip> : label}
        </p>
        <p className={cn('numeric mt-1 text-2xl font-semibold leading-none', toneClass)}>{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
