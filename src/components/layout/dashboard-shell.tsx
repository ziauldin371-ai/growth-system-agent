'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { LanguageProvider } from '@/context/language-context';
import { GuidedTour } from '@/components/ui/design-system';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { openTour, TourModal } = GuidedTour();

  return (
    <LanguageProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans text-base">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onOpenTour={openTour} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        {TourModal}
      </div>
    </LanguageProvider>
  );
}
