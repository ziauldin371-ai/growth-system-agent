import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Growth System — Simple Client Finder',
  description:
    'Autonomous client finder, website verification, and personalized outreach for Zia Ul Din.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen selection:bg-primary-container selection:text-on-primary-container antialiased">
        {children}
      </body>
    </html>
  );
}
