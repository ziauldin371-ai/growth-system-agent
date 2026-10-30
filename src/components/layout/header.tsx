'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Languages, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export function Header({ onOpenTour }: { onOpenTour?: () => void }) {
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/businesses?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 sm:px-8 flex items-center justify-between shrink-0 z-30">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex items-center space-x-3 w-64 sm:w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'ur' ? 'Karobaar ya shehar dhoondein...' : 'Search businesses or cities...'}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </form>

      {/* Top Bar Actions */}
      <div className="flex items-center space-x-3">
        {/* Language Toggle (English <-> Roman Urdu) */}
        <button
          onClick={toggleLanguage}
          aria-label="Toggle language English / Roman Urdu"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          title="Switch language between English and Roman Urdu"
        >
          <Languages className="w-3.5 h-3.5 text-indigo-400" />
          <span>{language === 'en' ? 'Roman Urdu' : 'English'}</span>
        </button>

        {/* Guided Tour Link */}
        {onOpenTour && (
          <button
            onClick={onOpenTour}
            aria-label="Replay guided tour"
            className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Replay guided tour"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tour</span>
          </button>
        )}

        {/* The single primary CTA button in top bar: 'Find Businesses' */}
        <Link
          href="/run-and-schedule"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('action.find_now', 'Find Businesses')}</span>
        </Link>
      </div>
    </header>
  );
}
