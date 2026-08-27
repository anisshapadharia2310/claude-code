'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-items';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const groups = ['Work', 'Data', 'Administration'] as const;

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 px-3 py-4">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-400">
              {group}
            </p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-brand-600 font-medium text-white'
                          : 'text-navy-200 hover:bg-navy-800 hover:text-white',
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" fill="currentColor">
                        <path d={item.icon} />
                      </svg>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
