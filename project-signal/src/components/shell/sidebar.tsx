'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { SignalMark } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, type NavItem } from './nav-items';

const STORAGE_KEY = 'signal:sidebar-collapsed';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The navigation list, shared by the desktop rail and the mobile drawer. */
export function NavList({
  items, collapsed = false, onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className={cn('flex flex-col gap-6', collapsed ? 'px-2' : 'px-3')}>
      {NAV_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;

        return (
          <div key={group}>
            {collapsed ? (
              <div aria-hidden="true" className="mx-2 mb-2 h-px bg-white/8" />
            ) : (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-400">
                {group}
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {groupItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? `${item.label} — ${item.hint}` : undefined}
                      className={cn(
                        'group relative flex items-center rounded-lg text-sm transition-all duration-[140ms]',
                        collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2',
                        active
                          ? 'bg-white/10 font-semibold text-white'
                          : 'text-navy-300 hover:bg-white/6 hover:text-white',
                      )}
                    >
                      {/* The active rail: a colour cue that survives greyscale as a shape. */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400 transition-all duration-[180ms]',
                          active ? 'h-5 opacity-100' : 'h-0 opacity-0',
                          collapsed && '-left-2',
                        )}
                      />
                      <Icon
                        name={item.icon}
                        className={cn('h-[18px] w-[18px] shrink-0 transition-colors', active ? 'text-accent-300' : 'text-navy-400 group-hover:text-navy-200')}
                      />
                      {collapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      )}
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

/**
 * The desktop sidebar.
 *
 * Collapses to an icon rail. The choice is remembered per browser, which is a
 * presentation preference only — it changes nothing about what is reachable.
 */
export function Sidebar({ items, footer }: { items: NavItem[]; footer?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* Storage can be unavailable; the default expanded state is fine. */
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* Ignore: the preference simply will not persist. */
      }
      return next;
    });
  }, []);

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'surface-command hidden shrink-0 flex-col shadow-rail lg:flex',
        'transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        collapsed ? 'w-[68px]' : 'w-64',
        !ready && 'invisible',
      )}
    >
      <div className={cn('flex items-center gap-2.5 py-5', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="Project SIGNAL, go to dashboard">
          <SignalMark className="h-8 w-8 shrink-0" />
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-tight tracking-[-0.01em] text-white">
                SIGNAL
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-accent-300/90">
                Revenue Intelligence
              </span>
            </span>
          ) : null}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        <NavList items={items} collapsed={collapsed} />
      </div>

      {footer && !collapsed ? <div className="px-3 pb-2">{footer}</div> : null}

      <div className={cn('border-t border-white/8 p-2', collapsed ? 'flex justify-center' : '')}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
          className={cn(
            'flex items-center gap-2 rounded-lg text-xs font-medium text-navy-400 transition-colors hover:bg-white/6 hover:text-white',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full px-3 py-2',
          )}
        >
          <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} className="h-4 w-4" />
          {!collapsed ? <span>Collapse</span> : <span className="sr-only">Expand the sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
