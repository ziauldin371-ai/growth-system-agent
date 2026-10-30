'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { LanguageProvider } from '@/context/language-context';
import { GuidedTour } from '@/components/ui/design-system';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { openTour, TourModal } = GuidedTour();

  return (
    <LanguageProvider>
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface font-sans text-base">
        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header onOpenTour={openTour} />

          <main className="flex-1 overflow-y-auto px-gutter-sm lg:px-8 py-4 pb-24 lg:pb-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation (hidden on desktop) */}
          <BottomNav />
        </div>

        {TourModal}
      </div>
    </LanguageProvider>
  );
}
