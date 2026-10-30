'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

export function Header({ onOpenTour }: { onOpenTour?: () => void }) {
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
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('growth_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('growth_theme', 'light');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/businesses?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="px-gutter-sm lg:px-8 py-2.5 flex flex-col gap-2">
        {/* Row 1: Brand / Title + Actions */}
        <div className="flex items-center justify-between gap-space-xs">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-space-sm">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-container via-indigo-600 to-primary flex items-center justify-center text-on-primary-container font-bold text-sm shadow-[0_0_12px_rgba(91,91,240,0.4)] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </div>
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    Growth System
                  </span>
                  {isDemoActive && (
                    <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-[10px] tracking-wider uppercase font-bold">
                      DEMO MODE
                    </span>
                  )}
                </div>
                <span className="font-label-md text-[11px] text-on-surface-variant hidden sm:inline">
                  Simple Client Finder
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher (EN | اردو) */}
            <button
              onClick={toggleLanguage}
              type="button"
              className="min-h-[44px] px-2.5 py-1.5 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md active:bg-surface-variant transition-colors"
              title="Switch Language: English / Roman Urdu"
              aria-label="Switch Language: English / Roman Urdu"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">translate</span>
              <span className="text-xs font-semibold">{language === 'en' ? 'EN | اردو' : 'اردو | EN'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={handleToggleTheme}
              type="button"
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark / Light Theme"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Quick Tour */}
            {onOpenTour && (
              <button
                onClick={onOpenTour}
                type="button"
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-variant transition-colors"
                title="Quick Tour"
                aria-label="Start Quick Tour"
              >
                <span className="material-symbols-outlined text-[18px]">help</span>
              </button>
            )}

            {/* Desktop / Mobile CTA Button: 'Find Businesses Now' */}
            <Link
              href="/run-and-schedule"
              className="min-h-[44px] px-3 sm:px-4 py-1.5 bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-lg shadow-[0_0_16px_rgba(91,91,240,0.35)] flex items-center gap-1.5 active:opacity-90 transition-opacity whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span className="text-xs sm:text-sm font-semibold">{t('action.find_now', 'Find Businesses Now')}</span>
            </Link>

            {/* User Profile Avatar */}
            <div className="relative flex items-center pl-1">
              <div
                className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-primary-container text-on-surface font-semibold text-xs flex items-center justify-center select-none"
                title="Zia Ul Din (Operator)"
              >
                ZD
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Search Input (Full width, mobile-friendly, 44px min-height) */}
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
                ? 'Karobaar ya shehar dhoondein (jaise Manchester)...'
                : 'Search local businesses or leads (e.g. Manchester)...'
            }
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-xs sm:text-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
          />
        </form>
      </div>
    </header>
  );
}
