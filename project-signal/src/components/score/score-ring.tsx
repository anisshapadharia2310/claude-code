import { cn } from '@/lib/utils';

/**
 * The total score as a ring.
 *
 * The arc is coloured by the band the score falls in, using the same palette as
 * the priority badges, so the ring and the badge agree at a glance. The number
 * in the middle is the same number the table shows — nothing is rounded or
 * rescaled for display.
 */
export function ScoreRing({
  value, max = 100, size = 'md', label = 'Total score', className,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  const dimensions = { sm: 56, md: 84, lg: 112 }[size];
  const stroke = { sm: 5, md: 7, lg: 9 }[size];
  const radius = (dimensions - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  // Thresholds mirror the priority model: 80 / 60 / 40.
  const tone =
    value >= 80 ? { arc: 'var(--color-brand-700)', text: 'text-brand-700' }
    : value >= 60 ? { arc: 'var(--color-warn-500)', text: 'text-warn-700' }
    : value >= 40 ? { arc: 'var(--color-navy-400)', text: 'text-navy-600' }
    : { arc: 'var(--color-danger-500)', text: 'text-danger-700' };

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: dimensions, height: dimensions }}
      role="img"
      aria-label={`${label}: ${value} out of ${max}`}
    >
      <svg width={dimensions} height={dimensions} className="-rotate-90">
        <circle
          cx={dimensions / 2} cy={dimensions / 2} r={radius}
          fill="none" stroke="var(--color-navy-100)" strokeWidth={stroke}
        />
        <circle
          cx={dimensions / 2} cy={dimensions / 2} r={radius}
          fill="none" stroke={tone.arc} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'tabular font-semibold leading-none tracking-[-0.03em]',
            size === 'sm' ? 'text-base' : size === 'md' ? 'text-2xl' : 'text-3xl',
            tone.text,
          )}
        >
          {value}
        </span>
        {size !== 'sm' ? (
          <span className="mt-0.5 text-[10px] font-medium text-navy-400">of {max}</span>
        ) : null}
      </div>
    </div>
  );
}

/** A compact six-segment read of the band scores, for table cells and headers. */
export function BandSparks({
  bands, className,
}: {
  bands: Array<{ band: string; label: string; score: number; max: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-end gap-[3px]', className)}
      role="img"
      aria-label={bands.map((band) => `${band.label} ${band.score} of ${band.max}`).join(', ')}
    >
      {bands.map((band) => {
        const ratio = band.max > 0 ? band.score / band.max : 0;
        return (
          <span
            key={band.band}
            title={`${band.band}. ${band.label}: ${band.score} of ${band.max}`}
            className="relative flex h-6 w-1.5 items-end overflow-hidden rounded-full bg-navy-100"
          >
            <span
              className="w-full rounded-full bg-brand-600 transition-[height] duration-500"
              style={{ height: `${Math.max(ratio * 100, ratio > 0 ? 12 : 0)}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}
