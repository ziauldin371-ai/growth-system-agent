'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

interface HeaderProps {
  onOpenTour?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenEmergencyStop?: () => void;
  onOpenShortcuts?: () => void;
  isDense?: boolean;
  onToggleDense?: () => void;
}

export function Header({
  onOpenTour,
  onOpenCommandPalette,
  onOpenEmergencyStop,
  onOpenShortcuts,
  isDense,
  onToggleDense,
}: HeaderProps) {
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check if demo data is currently seeded/active
    fetch('/api/demo/toggle')
      .then((res) => res.json())
      .then((data) => setIsDemoActive(Boolean(data.hasDemoData)))
      .catch(() => {});

    // Sync theme
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const handleToggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('growth_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('growth_theme', 'light');
      }
    } catch {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/businesses?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="px-3 sm:px-4 lg:px-6 py-2 flex flex-col gap-2 max-w-[1440px] mx-auto w-full">
        {/* Row 1: Brand / Title + Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-container via-indigo-600 to-primary flex items-center justify-center text-on-primary-container font-bold text-sm shadow-[0_0_12px_rgba(91,91,240,0.4)] group-hover:scale-105 transition-transform shrink-0">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </div>
              <div className="flex flex-col leading-tight truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-label-lg text-sm sm:text-base text-on-surface font-bold truncate">
                    Growth System
                  </span>
                  {isDemoActive && (
                    <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[10px] tracking-wider uppercase font-bold shrink-0">
                      DEMO MODE
                    </span>
                  )}
                </div>
                <span className="font-label-md text-[11px] text-on-surface-variant hidden sm:inline truncate">
                  Simple Client Finder
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">


            {/* Quick Command Palette Button (⌘K) on Laptop */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant/30 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Command Palette (Ctrl+K / ⌘K)"
                aria-label="Open command search"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                <span className="hidden md:inline font-sans">Command</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-[10px] font-mono text-outline border border-outline-variant/40">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Dense Mode Toggle on Laptop */}
            {onToggleDense && (
              <button
                type="button"
                onClick={onToggleDense}
                className={`hidden md:flex min-h-[44px] min-w-[44px] p-2 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isDense
                    ? 'bg-primary-container text-on-primary-container border-primary/40'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/30'
                }`}
                title={isDense ? 'Switch to Comfortable View' : 'Switch to Compact / Dense View'}
                aria-label="Toggle compact dense view"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDense ? 'density_medium' : 'density_small'}
                </span>
              </button>
            )}

            {/* Language Switcher (EN | اردو) */}
            <button
              onClick={toggleLanguage}
              type="button"
              className="min-h-[44px] px-2.5 py-1.5 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-xs font-semibold active:bg-surface-variant transition-colors border border-outline-variant/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Switch Language: English / Roman Urdu"
              aria-label="Switch Language: English / Roman Urdu"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">translate</span>
              <span>{language === 'en' ? 'EN | اردو' : 'اردو | EN'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={handleToggleTheme}
              type="button"
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors border border-outline-variant/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark / Light Theme"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Keyboard Shortcuts Sheet '?' */}
            {onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                type="button"
                className="hidden sm:flex min-h-[44px] min-w-[44px] p-2 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors border border-outline-variant/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Keyboard Shortcuts (?)"
                aria-label="Keyboard Shortcuts"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard</span>
              </button>
            )}

            {/* Quick Tour Help */}
            {onOpenTour && (
              <button
                onClick={onOpenTour}
                type="button"
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors border border-outline-variant/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Quick Tour"
                aria-label="Start Quick Tour"
              >
                <span className="material-symbols-outlined text-[18px]">help</span>
              </button>
            )}

            {/* Sticky "Find Businesses Now" CTA Button */}
            <Link
              href="/run-and-schedule"
              className="min-h-[44px] px-3 sm:px-4 py-1.5 bg-primary-container text-on-primary-container font-label-lg rounded-lg shadow-[0_0_16px_rgba(91,91,240,0.35)] flex items-center gap-1.5 active:opacity-90 transition-opacity whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span className="text-xs sm:text-sm font-semibold">{t('action.find_now', 'Find Businesses Now')}</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Search Input (Full width, 16px font on mobile to prevent iOS auto-zoom) */}
        <form onSubmit={handleSearch} className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
            search
          </span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            type="search"
            placeholder={
              language === 'ur'
                ? 'Karobaar ya shehar dhoondein (Press / to search)...'
                : 'Search local businesses or leads (Press / to focus)...'
            }
            className="w-full h-10 pl-9 pr-12 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-[16px] sm:text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-outline text-[11px] font-mono pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-[10px]">
              /
            </kbd>
          </div>
        </form>
      </div>
    </header>
  );
}
