import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card.
 *
 * The default surface for everything in the product. Elevation is a signal:
 * `flat` for content that sits in a grid, `raised` for something that has been
 * pulled forward, `interactive` for a card that is also a link.
 */
export function Card({
  className, elevation = 'flat', accent, ...props
}: HTMLAttributes<HTMLElement> & {
  elevation?: 'flat' | 'raised' | 'interactive';
  /** Draws a 2px coloured rule along the top edge. */
  accent?: 'brand' | 'accent' | 'success' | 'warn' | 'danger' | 'none';
}) {
  const accents: Record<string, string> = {
    brand: 'before:bg-brand-600',
    accent: 'before:bg-accent-500',
    success: 'before:bg-success-600',
    warn: 'before:bg-warn-500',
    danger: 'before:bg-danger-600',
    none: '',
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-surface',
        elevation === 'flat' && 'shadow-xs',
        elevation === 'raised' && 'shadow-md',
        elevation === 'interactive' &&
          'shadow-xs transition-[box-shadow,border-color,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md',
        accent && accent !== 'none' &&
          cn('before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-[""]', accents[accent]),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title, description, actions, icon, className, dense,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line',
        dense ? 'px-4 py-3' : 'px-5 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-600">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-navy-900">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunk px-5 py-3', className)}
      {...props}
    />
  );
}

/** A titled block inside a card body, for grouping related fields or facts. */
export function CardSection({
  title, children, className, actions,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('border-t border-line px-5 py-4 first:border-t-0', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="eyebrow">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}
