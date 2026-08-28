import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#0d1728',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
