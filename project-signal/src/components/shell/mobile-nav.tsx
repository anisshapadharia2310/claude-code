'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon, SignalMark } from '@/components/ui/icon';
import { NavList } from './sidebar';
import type { NavItem } from './nav-items';

/**
 * Navigation for narrow viewports.
 *
 * A slide-over drawer over the same navigation list the desktop rail uses, so
 * every destination stays reachable on a phone. Closes on route change, on
 * Escape, and on a click outside; body scroll is locked while it is open.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="-ml-1 rounded-lg p-2 text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-900 lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="surface-command absolute inset-y-0 left-0 flex w-[272px] flex-col shadow-lg animate-rise">
            <div className="flex items-center justify-between px-5 py-5">
              <span className="flex items-center gap-2.5">
                <SignalMark className="h-8 w-8" />
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-white">SIGNAL</span>
                  <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-accent-300/90">
                    Revenue Intelligence
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-white/6 hover:text-white"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <NavList items={items} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
