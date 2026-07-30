import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Vista Floor — Missing Items',
  description:
    'Scan any item at the Sardis facility and find out immediately whether it is on the missing list.',
  // Nothing here should ever be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Do not lock zoom. Someone will need to enlarge a note, and blocking that
  // fails anyone with low vision for no real benefit.
  maximumScale: 5,
  themeColor: '#0b111d',
  // Extend under the notch; the shell pads with safe-area insets.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
