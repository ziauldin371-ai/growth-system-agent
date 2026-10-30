'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { LanguageProvider } from '@/context/language-context';
import { GuidedTour } from '@/components/ui/design-system';
import { ToastProvider } from '@/components/ui/toast-context';
import { CommandPalette } from '@/components/layout/command-palette';
import { ShortcutsModal } from '@/components/layout/shortcuts-modal';
import { EmergencyStopModal } from '@/components/layout/emergency-stop-modal';
import { KeyboardShortcuts } from '@/components/layout/keyboard-shortcuts';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { openTour, TourModal } = GuidedTour();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isEmergencyStopOpen, setIsEmergencyStopOpen] = useState(false);
  const [isDense, setIsDense] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('growth_dense_mode');
      if (stored === 'true') setIsDense(true);
    } catch {}
  }, []);

  const handleToggleDense = () => {
    setIsDense((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('growth_dense_mode', String(next));
      } catch {}
      return next;
    });
  };

  const handleCloseAll = () => {
    setIsCommandPaletteOpen(false);
    setIsShortcutsOpen(false);
    setIsEmergencyStopOpen(false);
  };

  return (
    <LanguageProvider>
      <ToastProvider>
        <div
          className={`flex h-screen overflow-x-hidden overflow-y-hidden bg-surface text-on-surface font-sans text-base antialiased ${
            isDense ? 'layout-dense' : ''
          }`}
        >
          {/* Global Keyboard Shortcut Handlers */}
          <KeyboardShortcuts
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onCloseAll={handleCloseAll}
          />

          {/* Desktop/Tablet Left Sidebar (Slim icon rail on tablet 768px, 260px on laptop 1024px) */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-hidden relative">
            <Header
              onOpenTour={openTour}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onOpenEmergencyStop={() => setIsEmergencyStopOpen(true)}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              isDense={isDense}
              onToggleDense={handleToggleDense}
            />

            {/* Scrollable Page Canvas: max-width 1200px on laptop, 1360px on 2xl */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 lg:px-6 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 focus:outline-none"
            >
              <div className="max-w-[1200px] 2xl:max-w-[1360px] mx-auto w-full">
                {children}
              </div>
            </main>

            {/* Mobile Bottom Navigation (Phone < 768px only) */}
            <BottomNav onOpenHelp={openTour} />
          </div>

          {/* Global Dialog Overlays */}
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onOpenEmergencyStop={() => setIsEmergencyStopOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
          />

          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />

          <EmergencyStopModal
            isOpen={isEmergencyStopOpen}
            onClose={() => setIsEmergencyStopOpen(false)}
          />

          {TourModal}
        </div>
      </ToastProvider>
    </LanguageProvider>
  );
}
