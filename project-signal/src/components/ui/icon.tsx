import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Icon set.
 *
 * Stroke icons on a 24-unit grid, drawn to a single weight so the interface
 * reads as one family. Shipped inline rather than as a dependency: the set is
 * small, and every icon here is one the product actually uses.
 *
 * Icons are decorative by default (aria-hidden). Pass a `title` when an icon is
 * the only label for a control.
 */
export const ICON_PATHS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  contacts: 'M16 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7.5 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19v-1c0-2 2.7-3.5 6.5-3.5M22 20v-1.5c0-2.5-3.5-4.5-6-4.5s-6 2-6 4.5V20',
  outreach: 'M8.4 4.5H5.2A2.2 2.2 0 0 0 3 6.9C3 13.9 9.6 20.5 16.6 20.5a2.2 2.2 0 0 0 2.4-2.2v-3.2l-3.4-1.1-1.9 1.9a14.4 14.4 0 0 1-5.1-5.1l1.9-1.9L8.4 4.5Z',
  review: 'M9 12.5 11 14.5 15.5 10M12 3l7.5 3v5.5c0 4.4-3.1 8.4-7.5 9.5-4.4-1.1-7.5-5.1-7.5-9.5V6L12 3Z',
  accounts: 'M3 21h18M5 21V7l6-4v18M15 21V10h4v11M8 9h1m-1 3h1m-1 3h1',
  campaigns: 'M3 10v4h3l5 4V6L6 10H3Zm13.5 2a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5Zm-.5 7.5a8 8 0 0 0 0-15',
  import: 'M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  quality: 'M12 3 4 6v5.5c0 4.4 3.2 8.4 8 9.5 4.8-1.1 8-5.1 8-9.5V6l-8-3Zm0 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 8a6 6 0 0 1 4.4 2 7.5 7.5 0 0 1-8.8 0 6 6 0 0 1 4.4-2Z',
  compliance: 'M12 3 4 6v5.5c0 4.4 3.2 8.4 8 9.5 4.8-1.1 8-5.1 8-9.5V6l-8-3Zm-2.2 8.8 1.8 1.8 3.6-3.6',
  scoring: 'M4 20V11m5 9V5m5 15v-6m5 6V8',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8v-.5C4 16.5 7.6 15 12 15s8 1.5 8 4.5V20',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronsLeft: 'm11 6-6 6 6 6m7-12-6 6 6 6',
  chevronsRight: 'm13 6 6 6-6 6M6 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21',
  filter: 'M4 5h16l-6 7v6l-4 2v-8L4 5Z',
  check: 'm5 12.5 4.5 4.5L19 7',
  alert: 'M12 8v5m0 3.5v.2M10.3 4l-7.7 13a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5V16m0-7.7v.2',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2',
  mail: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Zm0 .5 9 6 9-6',
  phone: 'M8.4 5H5.2A2.2 2.2 0 0 0 3 7.4C3 14.4 9.6 21 16.6 21a2.2 2.2 0 0 0 2.4-2.2v-3.2l-3.4-1.1-1.9 1.9a14.4 14.4 0 0 1-5.1-5.1l1.9-1.9L8.4 5Z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.3A8 8 0 1 1 21 12Z',
  building: 'M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M15 11h3a2 2 0 0 1 2 2v8M3 21h18M8 7h3M8 11h3M8 15h3',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z',
  spark: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1',
  trendUp: 'M3 17 9.5 10.5l4 4L21 7m0 0h-5.5M21 7v5.5',
  download: 'M12 3v11m0 0 4-4m-4 4-4-4M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1',
  refresh: 'M20 11a8 8 0 0 0-14-4.5L4 9m0-5v5h5m-5 2a8 8 0 0 0 14 4.5L20 15m0 5v-5h-5',
  logout: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m6 13 4-4-4-4m4 4H10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3 3.6-4.5 8-4.5s8 1.5 8 4.5',
  shield: 'M12 3 4 6v5.5c0 4.4 3.2 8.4 8 9.5 4.8-1.1 8-5.1 8-9.5V6l-8-3Z',
  document: 'M14 3v5h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM9 13h6m-6 4h4',
  sort: 'M8 4v16m0 0-3-3m3 3 3-3M16 20V4m0 0-3 3m3-3 3 3',
  external: 'M14 4h6m0 0v6m0-6L11 13M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4',
  plus: 'M12 5v14M5 12h14',
  dot: 'M12 12h.01',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Accessible name. Omit for decorative icons. */
  title?: string;
  strokeWidth?: number;
}

export function Icon({ name, title, className, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn('h-4 w-4 shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** The SIGNAL mark: an ascending signal read, drawn rather than imported. */
export function SignalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn('h-7 w-7', className)} aria-hidden="true">
      <defs>
        <linearGradient id="signal-mark" x1="0" y1="28" x2="28" y2="0">
          <stop offset="0%" stopColor="var(--color-brand-500)" />
          <stop offset="100%" stopColor="var(--color-accent-400)" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#signal-mark)" />
      <g stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
        <path d="M8 19.5v-3" opacity="0.55" />
        <path d="M13 19.5v-6" opacity="0.8" />
        <path d="M18 19.5v-9" />
      </g>
      <circle cx="18" cy="8" r="2" fill="#fff" />
    </svg>
  );
}
