'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { cn } from '@/lib/utils';

/** Navigation is filtered by capability, matching the server-side permissions. */
const NAV: Array<{ href: string; label: string; capability: string; group: string }> = [
  { href: '/dashboard', label: 'Dashboard', capability: 'dashboard:view', group: 'Overview' },
  { href: '/campaigns', label: 'Campaigns', capability: 'campaign:view', group: 'Overview' },
  { href: '/accounts', label: 'Accounts', capability: 'contact:view', group: 'Data' },
  { href: '/contacts', label: 'Contacts', capability: 'contact:view', group: 'Data' },
  { href: '/import', label: 'Import', capability: 'contact:import', group: 'Data' },
  { href: '/data-quality', label: 'Data quality', capability: 'contact:view', group: 'Data' },
  { href: '/review', label: 'Review queue', capability: 'review:perform', group: 'Qualification' },
  { href: '/outreach', label: 'Outreach', capability: 'outreach:perform', group: 'Qualification' },
  { href: '/compliance', label: 'Compliance', capability: 'contact:view', group: 'Governance' },
  { href: '/admin/users', label: 'Users', capability: 'user:manage', group: 'Governance' },
];

const PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: NAV.map((item) => item.capability),
  MANAGER: ['dashboard:view', 'campaign:view', 'contact:view', 'review:perform', 'outreach:perform'],
  RESEARCHER: ['dashboard:view', 'campaign:view', 'contact:view', 'contact:import', 'review:perform'],
  CALLER: ['dashboard:view', 'campaign:view', 'contact:view', 'outreach:perform'],
};

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const allowed = new Set(PERMISSIONS[role]);
  const items = NAV.filter((item) => allowed.has(item.capability));
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <nav
      aria-label="Main"
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto border-r border-navy-200 bg-card p-3 md:block"
    >
      {groups.map((group) => (
        <div key={group} className="mb-4">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-navy-900 font-medium text-white'
                          : 'text-navy-800 hover:bg-navy-100',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      <p className="mt-6 rounded border border-navy-200 bg-navy-50 p-2 text-[10px] leading-relaxed text-muted-foreground">
        Every score in SIGNAL is explainable. Hover any criterion to see the reason it was awarded or
        withheld.
      </p>
    </nav>
  );
}

/**
 * Below the md breakpoint the sidebar is hidden, so navigation moves into a
 * horizontally scrollable bar. Same capability filtering as the sidebar.
 */
export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const allowed = new Set(PERMISSIONS[role]);
  const items = NAV.filter((item) => allowed.has(item.capability));

  return (
    <nav
      aria-label="Main"
      className="sticky top-14 z-30 border-b border-navy-200 bg-card md:hidden"
    >
      <ul className="flex gap-1 overflow-x-auto px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors',
                  active ? 'bg-navy-900 font-medium text-white' : 'text-navy-800 hover:bg-navy-100',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
