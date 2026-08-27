import type { ScoreLine } from '@/lib/domain/types';
import { COMPONENT_LABELS } from '@/lib/domain/scoring/weights';
import { InfoTip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ORDER: Array<keyof typeof COMPONENT_LABELS> = [
  'A_FIT',
  'B_ROLE',
  'C_TRIGGER',
  'D_ENGAGEMENT',
  'E_DATA_QUALITY',
  'F_ATTENDANCE',
];

/**
 * Renders every criterion the engine evaluated, including the ones that scored
 * nothing. The brief requires the application to explain every score, so no
 * line is ever hidden.
 */
export function ScoreBreakdown({
  lines,
  engagementBonus = 0,
  compact = false,
}: {
  lines: ScoreLine[];
  engagementBonus?: number;
  compact?: boolean;
}) {
  const grouped = ORDER.map((component) => ({
    component,
    label: COMPONENT_LABELS[component],
    lines: lines.filter((line) => line.component === component),
  })).filter((group) => group.lines.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map((group) => {
        const earned = group.lines.reduce((sum, line) => sum + line.points, 0);
        const max = group.lines.reduce((sum, line) => sum + line.max, 0);
        const ratio = max ? (earned / max) * 100 : 0;
        return (
          <div key={group.component}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-semibold text-navy-900">{group.label}</h4>
              <span className="numeric text-sm font-semibold text-navy-700">
                {earned}
                <span className="text-muted-foreground">/{max}</span>
              </span>
            </div>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className={cn(
                  'h-full rounded-full',
                  ratio >= 75 ? 'bg-emerald-600' : ratio >= 40 ? 'bg-blue-600' : 'bg-amber-500',
                )}
                style={{ width: `${ratio}%` }}
              />
            </div>
            <ul className="space-y-1">
              {group.lines.map((line) => (
                <li
                  key={line.code}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded px-2 py-1 text-xs',
                    line.points > 0 ? 'bg-emerald-50/60' : 'bg-navy-50/60',
                  )}
                >
                  <span className="flex-1">
                    <InfoTip label={line.reason}>
                      <span className={cn(line.points > 0 ? 'text-navy-900' : 'text-muted-foreground')}>
                        {line.label}
                      </span>
                    </InfoTip>
                    {!compact ? (
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {line.reason}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'numeric shrink-0 font-semibold',
                      line.points > 0 ? 'text-emerald-700' : 'text-muted-foreground',
                    )}
                  >
                    {line.points}/{line.max}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {engagementBonus > 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <span className="font-semibold">Post-webinar engagement bonus: +{engagementBonus}</span>
          <span className="block text-[11px]">
            Added on top of the qualification score and capped so the total never exceeds 100.
          </span>
        </div>
      ) : null}
    </div>
  );
}
