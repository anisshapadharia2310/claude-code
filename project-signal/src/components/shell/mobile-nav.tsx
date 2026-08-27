'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import type { NavItem } from './nav-items';

/** Sidebar in a slide-over for narrow viewports. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="rounded-md p-2 text-navy-600 hover:bg-navy-100 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M3 6h18v2H3Zm0 5h18v2H3Zm0 5h18v2H3Z" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-navy-900">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-semibold text-white">SIGNAL</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded p-1 text-navy-300 hover:bg-navy-800 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="m19 6.4-1.4-1.4L12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12Z" />
                </svg>
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              <Sidebar items={items} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
