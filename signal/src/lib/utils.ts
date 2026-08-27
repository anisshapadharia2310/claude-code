import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turns SCREAMING_SNAKE enum values into readable labels. */
export function humanize(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(value);
}

/** Current local time for a contact, so callers dial at a sensible hour. */
export function localTime(timeZone: string | null | undefined): string {
  if (!timeZone) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
  } catch {
    return 'Unknown';
  }
}

/** True when it is a reasonable hour to call the contact. */
export function isCallableNow(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;
  try {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(new Date()),
    );
    return hour >= 8 && hour < 18;
  } catch {
    return false;
  }
}

export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const value = typeof date === 'string' ? new Date(date) : date;
  return Math.floor((Date.now() - value.getTime()) / 86_400_000);
}

export function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value}%`;
}

export function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}
