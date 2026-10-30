'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Building2, 
  Search, 
  Sparkles, 
  ExternalLink, 
  MapPin, 
  Globe, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';
import { BusinessEntity } from '@/types';
import { BusinessCard } from '@/components/dashboard/business-card';
import { PageHeader, EmptyState, StatusChip } from '@/components/ui/design-system';
import { useLanguage } from '@/context/language-context';

type TabKey = 'all' | 'no_website' | 'broken_website' | 'needs_ai' | 'hot_requests';

function BusinessesContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const initialTab = (searchParams.get('tab') as TabKey) || 'all';
  const initialQuery = searchParams.get('q') || '';
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [showDemo, setShowDemo] = useState(initialDemo);
  const [businesses, setBusinesses] = useState<BusinessEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads?demo=${showDemo}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setBusinesses(data.leads);
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showDemo]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const isDemo = (b: any) =>
    b.isSandboxData === true ||
    b.isDemo === true ||
    b.sourceProvider === 'b2b_mock' ||
    (b.domain && (b.domain.includes('.mock') || b.domain.includes('.internal')));

  const visibleBusinesses = businesses.filter(b => showDemo || !isDemo(b));

  // Tab Filtering Logic
  const filteredBusinesses = visibleBusinesses.filter((b) => {
    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = b.name?.toLowerCase().includes(q);
      const matchCity = b.city?.toLowerCase().includes(q);
      const matchIndustry = b.industry?.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchIndustry) return false;
    }

    // 2. Tab Filter
    const webStatus = b.websiteCheck?.status;
    const isNoWeb = !b.domain || webStatus === 'apparently_absent' || webStatus === 'social_only';
    const isBroken = webStatus === 'parked' || webStatus === 'broken';
    const isNeedsAi = b.pipelineType === 'ai_software_opportunities';
    const isHot = (b.heatScore || 0) >= 75 || b.sourceProvider === 'hacker_news' || b.sourceProvider === 'reddit';

    switch (activeTab) {
      case 'no_website':
        return isNoWeb;
      case 'broken_website':
        return isBroken;
      case 'needs_ai':
        return isNeedsAi;
      case 'hot_requests':
        return isHot;
      default:
        return true;
    }
  });

  const counts = {
    all: visibleBusinesses.length,
    no_website: visibleBusinesses.filter(b => !b.domain || b.websiteCheck?.status === 'apparently_absent' || b.websiteCheck?.status === 'social_only').length,
    broken_website: visibleBusinesses.filter(b => b.websiteCheck?.status === 'parked' || b.websiteCheck?.status === 'broken').length,
    needs_ai: visibleBusinesses.filter(b => b.pipelineType === 'ai_software_opportunities').length,
    hot_requests: visibleBusinesses.filter(b => (b.heatScore || 0) >= 75 || b.sourceProvider === 'hacker_news' || b.sourceProvider === 'reddit').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Demo Banner */}
      {showDemo && (
        <div className="p-4 rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-between gap-4 text-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <span className="font-bold text-sm">Demo data is shown; these are not real businesses</span>
              <span className="text-xs text-orange-300 ml-2">Simulated sandbox records. Outreach is blocked.</span>
            </div>
          </div>
          <button
            onClick={() => setShowDemo(false)}
            className="px-3.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-semibold shrink-0"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Who did we find?"
        subtitle="All discovered companies, grouped by what they need: new websites, website fixes, or AI/software."
        urduSubtitle="Miley huay karobaar dekhein: jin ki website nahi hai, tooti hui hai, ya software chahiye."
        helpContent={{
          titleEn: 'Understanding Businesses Found',
          titleUr: 'Miley Huay Karobaar Ko Samajhna',
          pointsEn: [
            'All: Shows every verified business discovered across US, UK, Canada, Australia and global registries.',
            'No Website: Businesses with zero web domain or operating only on social pages. Top priority for web pitches.',
            'Website Has Problems: Businesses whose websites are parked, slow, broken, or insecure.',
            'Needs AI / Software: Businesses seeking automated workflows, Python automation, or LLM agents.',
            'Hot Requests: People actively looking to hire freelance developers on forums (Hacker News, Reddit).',
          ],
          pointsUr: [
            'All: Woh tamam karobaar jo registries aur Google Places se miley hain.',
            'No Website: Jin ki koi website nahi ya sirf Facebook/Instagram hai. Inhein website ki ashad zaroorat hai.',
            'Website Has Problems: Jin ki website band hai ya tooti hui hai.',
            'Needs AI / Software: Jinhein Python, software ya AI automation ki zaroorat hai.',
            'Hot Requests: Log jo developers aur freelancers ko dhoond rahe hain.',
          ],
        }}
        actions={
          <Link
            href="/run-and-schedule"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Find More Businesses</span>
          </Link>
        }
      />

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900/80 border border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('no_website')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'no_website'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-rose-400" />
            <span>No Website</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.no_website}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('broken_website')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'broken_website'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Website Has Problems</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.broken_website}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('needs_ai')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'needs_ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Needs AI / Software</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.needs_ai}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hot_requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'hot_requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Hot Requests</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.hot_requests}
            </span>
          </button>
        </div>

        {/* Controls: Search & Demo Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Show demo data</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">DEMO</span>
          </label>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business or city..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Business Cards List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading verified businesses from database...</p>
        </div>
      ) : filteredBusinesses.length > 0 ? (
        <div className="space-y-3">
          {filteredBusinesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-indigo-400" />}
          title="No businesses found in this category"
          description={
            searchTerm
              ? `No businesses matching "${searchTerm}". Try another search term.`
              : showDemo
              ? 'No demo businesses match this filter. Try selecting "All".'
              : 'No real businesses found in this category yet. Click "Find More Businesses" or turn on "Show demo data" to preview sample records.'
          }
          actionText="Find Businesses Now"
          actionHref="/run-and-schedule"
        />
      )}
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading businesses...</div>}>
      <BusinessesContent />
    </Suspense>
  );
}
