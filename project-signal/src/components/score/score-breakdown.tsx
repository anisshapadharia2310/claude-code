import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import type { StoredBreakdown } from '@/lib/score-breakdown';
import { BandSparks, ScoreRing } from './score-ring';

/**
 * The full derivation of a score.
 *
 * Every component is listed whether it scored or not, with the evidence and the
 * record fields it came from. A zero with a reason is worth more to a caller
 * than a zero on its own, so unearned components are shown quietly rather than
 * hidden.
 */

const BAND_ICON = {
  A: 'building', B: 'user', C: 'spark', D: 'trendUp', E: 'shield', F: 'clock',
} as const;

export function ScoreBreakdown({ breakdown }: { breakdown: StoredBreakdown }) {
  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- summary */}
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-gradient-to-br from-navy-50 to-surface px-5 py-4">
        <ScoreRing value={breakdown.totalScore} label="Total score" />

        <div className="min-w-0 flex-1">
          <p className="eyebrow">Total score</p>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <dt className="text-2xs text-navy-500">Base model</dt>
              <dd className="tabular text-lg font-semibold text-navy-900">{breakdown.baseScore}</dd>
            </div>
            <div>
              <dt className="text-2xs text-navy-500">Post-event bonus</dt>
              <dd className={cn('tabular text-lg font-semibold', breakdown.engagementBonus > 0 ? 'text-success-700' : 'text-navy-400')}>
                {breakdown.engagementBonus > 0 ? `+${breakdown.engagementBonus}` : '0'}
              </dd>
            </div>
            {breakdown.cappedAt100 ? (
              <div>
                <dt className="text-2xs text-navy-500">Ceiling</dt>
                <dd className="mt-1 inline-flex items-center gap-1 rounded-md border border-warn-200 bg-warn-50 px-1.5 py-1 text-2xs font-medium text-warn-800">
                  <Icon name="info" className="h-3 w-3" strokeWidth={2} />
                  Capped at 100
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          <BandSparks bands={breakdown.bands} />
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-navy-400">
            A · B · C · D · E · F
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------ bands */}
      <div className="grid gap-3 lg:grid-cols-2">
        {breakdown.bands.map((band) => {
          const ratio = band.max > 0 ? band.score / band.max : 0;
          return (
            <section key={band.band} className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <header className="border-b border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-navy-800">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-100 text-navy-500">
                      <Icon name={BAND_ICON[band.band as keyof typeof BAND_ICON] ?? 'dot'} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">
                      <span className="text-navy-400">{band.band}.</span> {band.label}
                    </span>
                  </h3>
                  <span className="tabular shrink-0 text-sm font-semibold text-navy-900">
                    {band.score}
                    <span className="font-normal text-navy-400">/{band.max}</span>
                  </span>
                </div>
                <div className="mt-2.5">
                  <Progress
                    value={band.score}
                    max={band.max}
                    label={`${band.label}: ${band.score} of ${band.max}`}
                    tone={ratio >= 0.75 ? 'success' : ratio >= 0.4 ? 'brand' : 'neutral'}
                  />
                </div>
              </header>

              <ul className="divide-y divide-line">
                {band.awards.map((item) => (
                  <li key={item.code} className={cn('flex gap-3 px-4 py-3', !item.awarded && 'bg-surface-sunk/60')}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                        item.awarded ? 'bg-success-100 text-success-700' : 'bg-navy-100 text-navy-400',
                      )}
                    >
                      {item.awarded
                        ? <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
                        : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={cn('text-sm leading-snug', item.awarded ? 'font-medium text-navy-800' : 'text-navy-500')}>
                          {item.label}
                        </p>
                        <span
                          className={cn(
                            'tabular shrink-0 text-xs font-semibold',
                            item.awarded ? 'text-navy-900' : 'text-navy-400',
                          )}
                        >
                          {item.points}<span className="font-normal text-navy-400">/{item.maxPoints}</span>
                          <span className="sr-only"> points {item.awarded ? 'awarded' : 'not awarded'}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-navy-500">{item.evidence}</p>
                      <p className="mt-1.5 truncate font-mono text-[10px] text-navy-400" title={item.sourceFields.join(' · ')}>
                        {item.sourceFields.join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* ------------------------------------------------------------ bonus */}
      {breakdown.engagementBonusDetail.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success-50 text-success-700">
                <Icon name="spark" className="h-3.5 w-3.5" />
              </span>
              Post-event engagement bonus
            </h3>
            <span className="tabular text-sm font-semibold text-success-700">
              +{breakdown.engagementBonus}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {breakdown.engagementBonusDetail.map((entry, index) => (
              <li key={`${entry.eventType}-${index}`} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className={cn('text-sm', entry.points > 0 ? 'text-navy-800' : 'text-navy-400')}>
                    {entry.label}
                  </p>
                  {entry.suppressedReason ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{entry.suppressedReason}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'tabular shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                    entry.points > 0 ? 'bg-success-50 text-success-700' : 'bg-navy-100 text-navy-400',
                  )}
                >
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

/** Compact band bars for a card header or a table cell. */
export function ScoreBands({ breakdown }: { breakdown: StoredBreakdown }) {
  return <BandSparks bands={breakdown.bands} />;
}
