import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

/**
 * Data table.
 *
 * Enterprise density: compact rows, a sticky header that survives a long scroll,
 * hairline separators rather than zebra striping, and a hover state strong
 * enough to track a row across fifteen columns. Wide tables scroll inside their
 * own container so the page itself never scrolls sideways.
 */
export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'w-full overflow-auto overscroll-x-contain',
        '[scrollbar-width:thin]',
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full min-w-full border-separate border-spacing-0 text-sm', className)}
      {...props}
    />
  );
}

export function Th({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 border-b border-line bg-surface-sunk/95 px-3 py-2.5 backdrop-blur-sm',
        'text-2xs font-semibold uppercase tracking-[0.06em] text-navy-500',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}

/** A column header that toggles sorting. Renders a link so it works without JS. */
export function SortableTh({
  label, field, currentSort, currentDir, buildHref, numeric, className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentDir: 'asc' | 'desc';
  /** Returns the URL for the next sort state of this column. */
  buildHref: (field: string, dir: 'asc' | 'desc') => string;
  numeric?: boolean;
  className?: string;
}) {
  const active = currentSort === field;
  const nextDir: 'asc' | 'desc' = active && currentDir === 'desc' ? 'asc' : 'desc';

  return (
    <Th numeric={numeric} className={className} aria-sort={active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Link
        href={buildHref(field, nextDir)}
        className={cn(
          'group inline-flex items-center gap-1 rounded-xs transition-colors hover:text-navy-800',
          active && 'text-navy-800',
          numeric && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon
          name={active ? 'chevronDown' : 'sort'}
          className={cn(
            'h-3 w-3 transition-transform',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
            active && currentDir === 'asc' && 'rotate-180',
          )}
          strokeWidth={2.25}
        />
        <span className="sr-only">
          {active ? `sorted ${currentDir === 'asc' ? 'ascending' : 'descending'}, ` : ''}
          sort {nextDir === 'asc' ? 'ascending' : 'descending'}
        </span>
      </Link>
    </Th>
  );
}

export function Td({
  className, numeric, ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'border-b border-line px-3 py-2.5 align-top text-navy-700',
        numeric && 'tabular text-right',
        className,
      )}
      {...props}
    />
  );
}

export function Tr({
  className, selected, ...props
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        'group transition-colors duration-[120ms]',
        'hover:bg-brand-50/50',
        selected && 'bg-brand-50 hover:bg-brand-50',
        className,
      )}
      {...props}
    />
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-14">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-navy-400">
            <Icon name="search" className="h-5 w-5" />
          </span>
          <p className="text-base font-medium text-navy-700">No matching records</p>
          <p className="mt-1 text-xs leading-relaxed text-navy-500">
            {children ?? 'Nothing matches the current filters. Widen the search or clear a filter to see more.'}
          </p>
        </div>
      </td>
    </tr>
  );
}

/**
 * The count line above a table. Not pagination: the tables in this product show
 * a capped result set, and the cap is stated rather than hidden behind pages.
 */
export function TableCaption({
  showing, total, className, children,
}: {
  showing: number;
  total: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-navy-500', className)}>
      <p className="tabular">
        Showing <span className="font-semibold text-navy-700">{showing.toLocaleString('en-GB')}</span>
        {showing !== total ? <> of {total.toLocaleString('en-GB')}</> : null} records
      </p>
      {children}
    </div>
  );
}
