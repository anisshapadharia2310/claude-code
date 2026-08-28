import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Inter, self-hosted.
 *
 * The variable file is committed to the repository rather than fetched from a
 * CDN at build time, so a clean clone builds offline and no request leaves the
 * browser for a font.
 */
const inter = localFont({
  src: [
    { path: './fonts/inter-latin.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/inter-latin-ext.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
});

export const metadata: Metadata = {
  title: {
    default: 'Project SIGNAL',
    template: '%s · Project SIGNAL',
  },
  description:
    'Scored Intent and Granular Account-Level Listbuilding: qualify B2B contacts on company fit, role ownership, business triggers, intent, data quality and compliance.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#101a2c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* First stop for keyboard users on every page. */}
        <a
          href="#main-content"
          className="sr-only-focusable focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:h-auto focus:w-auto focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
