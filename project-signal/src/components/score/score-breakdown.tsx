import { Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import type { StoredBreakdown } from '@/lib/score-breakdown';

/**
 * The full derivation of a score.
 *
 * Every component is listed whether it scored or not, with the evidence and the
 * record fields it came from. A zero with a reason is more useful than a zero.
 */
export function ScoreBreakdown({ breakdown }: { breakdown: StoredBreakdown }) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-line bg-navy-50/70 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tabular text-3xl font-semibold text-navy-900">{breakdown.totalScore}</span>
          <span className="text-sm text-navy-500">/ 100 total</span>
          <span className="ml-auto text-xs text-navy-500">
            base {breakdown.baseScore}
            {breakdown.engagementBonus > 0 ? ` + ${breakdown.engagementBonus} post-event` : ''}
            {breakdown.cappedAt100 ? ' (capped at 100)' : ''}
          </span>
        </div>
        <div className="mt-2">
          <Progress value={breakdown.totalScore} label="Total score" />
        </div>
      </div>

      {breakdown.bands.map((band) => (
        <section key={band.band} className="rounded-md border border-line">
          <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-600">
              {band.band}. {band.label}
            </h3>
            <span className="tabular text-sm font-semibold text-navy-800">
              {band.score}<span className="font-normal text-navy-400"> / {band.max}</span>
            </span>
          </header>
          <ul className="divide-y divide-line">
            {band.awards.map((awardItem) => (
              <li key={awardItem.code} className="flex gap-3 px-4 py-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    awardItem.awarded ? 'bg-emerald-500' : 'bg-navy-200',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn('text-sm', awardItem.awarded ? 'font-medium text-navy-800' : 'text-navy-500')}>
                      {awardItem.label}
                    </p>
                    <span className={cn('tabular shrink-0 text-sm', awardItem.awarded ? 'font-semibold text-navy-800' : 'text-navy-400')}>
                      {awardItem.points} / {awardItem.maxPoints}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{awardItem.evidence}</p>
                  <p className="mt-1 font-mono text-[10px] text-navy-400">
                    {awardItem.sourceFields.join(' · ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {breakdown.engagementBonusDetail.length > 0 ? (
        <section className="rounded-md border border-line">
          <header className="flex items-center justify-between border-b border-line bg-white px-4 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy-600">
              Post-event engagement bonus
            </h3>
            <span className="tabular text-sm font-semibold text-navy-800">+{breakdown.engagementBonus}</span>
          </header>
          <ul className="divide-y divide-line">
            {breakdown.engagementBonusDetail.map((entry, index) => (
              <li key={`${entry.eventType}-${index}`} className="flex items-baseline justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className={cn('text-sm', entry.points > 0 ? 'text-navy-800' : 'text-navy-400 line-through')}>
                    {entry.label}
                  </p>
                  {entry.suppressedReason ? (
                    <p className="text-xs text-navy-500">{entry.suppressedReason}</p>
                  ) : null}
                </div>
                <span className="tabular shrink-0 text-sm font-medium text-navy-700">
                  {entry.points > 0 ? `+${entry.points}` : '0'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Compact band bars for a table cell or a card header. */
export function ScoreBands({ breakdown }: { breakdown: StoredBreakdown }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {breakdown.bands.map((band) => (
        <div
          key={band.band}
          title={`${band.band}. ${band.label}: ${band.score} of ${band.max}`}
          className="h-6 w-6 rounded-sm bg-navy-100"
          style={{
            background: `linear-gradient(to top, var(--color-brand-600) ${band.max > 0 ? (band.score / band.max) * 100 : 0}%, var(--color-navy-100) 0%)`,
          }}
        />
      ))}
    </div>
  );
}
