import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Growth System Agent — Autonomous Lead Generation Platform',
  description:
    'Automated B2B discovery, website verification, and personalized outreach for Zia Ul Din (Full Stack AI Developer & Automation Architect).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
