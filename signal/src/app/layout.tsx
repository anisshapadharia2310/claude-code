import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project SIGNAL',
  description:
    'Scored Intent and Granular Account-Level Listbuilding - qualify B2B contacts on fit, role ownership, triggers, intent, data quality and compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
