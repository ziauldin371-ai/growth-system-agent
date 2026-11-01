'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BusinessEntity } from '@/types';
import { BusinessCard } from '@/components/dashboard/business-card';
import { BusinessDetailsDrawer } from '@/components/dashboard/business-details-drawer';
import { ClientRequestsView } from '@/components/marketplace/client-requests-view';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

type TabKey = 'all' | 'no_website' | 'broken_website' | 'needs_ai' | 'hot_requests';
type ViewMode = 'grid' | 'table';

function BusinessesContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { success } = useToast();

  const initialTab = (searchParams.get('tab') as TabKey) || 'all';
  const initialQuery = searchParams.get('q') || '';
  const initialDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';
  const initialSelectedId = searchParams.get('selected');

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [showDemo, setShowDemo] = useState(initialDemo);
  const [businesses, setBusinesses] = useState<BusinessEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: Grid (default) vs Table
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter Panel State
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMinMatch, setFilterMinMatch] = useState(0);
  const [filterHasEmail, setFilterHasEmail] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Selected Business for Details Drawer
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessEntity | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Batch Queue Modal State (Honesty Rule 6)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchQueueing, setIsBatchQueueing] = useState(false);
  const [batchResult, setBatchResult] = useState<{ queued: number; blocked: number; reasons: string[] } | null>(null);

  // Sorting for Table View
  const [sortField, setSortField] = useState<'name' | 'city' | 'score' | 'status'>('score');
  const [sortAsc, setSortAsc] = useState(false);

  // Restore saved view preference
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('growth_businesses_view');
      if (savedView === 'table' || savedView === 'grid') {
        setViewMode(savedView as ViewMode);
      }
    } catch {}
  }, []);

  const handleToggleView = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('growth_businesses_view', mode);
    } catch {}
  };

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads?demo=${showDemo}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setBusinesses(data.leads);

        // Pre-select if URL has selected param
        if (initialSelectedId) {
          const match = data.leads.find((l: BusinessEntity) => l.id === initialSelectedId);
          if (match) setSelectedBusiness(match);
        }
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showDemo, initialSelectedId]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const isDemo = (b: any) =>
    b.isSandboxData === true ||
    b.isDemo === true ||
    b.sourceProvider === 'b2b_mock' ||
    (b.domain && (b.domain.includes('.mock') || b.domain.includes('.internal')));

  const visibleBusinesses = businesses.filter((b) => showDemo || !isDemo(b));

  // Multi-facet filtering logic
  const filteredBusinesses = visibleBusinesses.filter((b) => {
    // 1. Search Query
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

    if (activeTab === 'no_website' && !isNoWeb) return false;
    if (activeTab === 'broken_website' && !isBroken) return false;
    if (activeTab === 'needs_ai' && !isNeedsAi) return false;
    if (activeTab === 'hot_requests' && !isHot) return false;

    // 3. Country Filter
    if (filterCountry !== 'all') {
      const country = (b.country || 'UK').toLowerCase();
      if (country !== filterCountry.toLowerCase()) return false;
    }

    // 4. City Filter
    if (filterCity.trim()) {
      if (!b.city?.toLowerCase().includes(filterCity.toLowerCase().trim())) return false;
    }

    // 5. Match Score Filter
    const score = b.score?.overallScore || 75;
    if (score < filterMinMatch) return false;

    // 6. Has Verified Email
    if (filterHasEmail) {
      const hasEmail = Boolean(b.contacts?.some((c) => Boolean(c.email)));
      if (!hasEmail) return false;
    }

    // 7. Has Verified Phone
    if (filterHasPhone) {
      const hasPhone = Boolean(b.phone || b.contacts?.some((c) => Boolean(c.phone)));
      if (!hasPhone) return false;
    }

    return true;
  });

  // Sort list for Table View
  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (sortField === 'name') {
      const res = (a.name || '').localeCompare(b.name || '');
      return sortAsc ? res : -res;
    }
    if (sortField === 'city') {
      const res = (a.city || '').localeCompare(b.city || '');
      return sortAsc ? res : -res;
    }
    if (sortField === 'score') {
      const scoreA = a.score?.overallScore || 0;
      const scoreB = b.score?.overallScore || 0;
      return sortAsc ? scoreA - scoreB : scoreB - scoreA;
    }
    return 0;
  });

  // Keyboard navigation across items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedBusiness) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedBusiness(null);
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(sortedBusinesses.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (sortedBusinesses[highlightedIndex]) {
          setSelectedBusiness(sortedBusinesses[highlightedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedBusinesses, highlightedIndex, selectedBusiness]);

  const counts = {
    all: visibleBusinesses.length,
    no_website: visibleBusinesses.filter(
      (b) => !b.domain || b.websiteCheck?.status === 'apparently_absent' || b.websiteCheck?.status === 'social_only'
    ).length,
    broken_website: visibleBusinesses.filter(
      (b) => b.websiteCheck?.status === 'parked' || b.websiteCheck?.status === 'broken'
    ).length,
    needs_ai: visibleBusinesses.filter((b) => b.pipelineType === 'ai_software_opportunities').length,
    hot_requests: visibleBusinesses.filter(
      (b) => (b.heatScore || 0) >= 75 || b.sourceProvider === 'hacker_news' || b.sourceProvider === 'reddit'
    ).length,
  };

  // Safe Batch Queue Handler (Honesty Rule 6)
  const handleBatchQueue = async () => {
    setIsBatchQueueing(true);
    setBatchResult(null);

    try {
      let queued = 0;
      let blocked = 0;
      const reasons: string[] = [];

      for (const lead of sortedBusinesses) {
        const hasVerifiedEmail = Boolean(lead.contacts?.some((c) => c.email && c.verificationStatus === 'verified'));
        const isDemoLead = isDemo(lead);

        if (isDemoLead) {
          blocked++;
          if (!reasons.includes('Demo/sandbox data is excluded from real queue')) {
            reasons.push('Demo/sandbox data is excluded from real queue');
          }
        } else if (!hasVerifiedEmail) {
          blocked++;
          if (!reasons.includes('Missing verified email address')) {
            reasons.push('Missing verified email address');
          }
        } else {
          queued++;
        }
      }

      setBatchResult({ queued, blocked, reasons });
      if (queued > 0) {
        success(`Queued ${queued} verified leads for safe dispatch.`);
      }
    } catch {
      setBatchResult({ queued: 0, blocked: sortedBusinesses.length, reasons: ['Safety evaluation failed'] });
    } finally {
      setIsBatchQueueing(false);
    }
  };

  const handleResetFilters = () => {
    setActiveTab('all');
    setSearchTerm('');
    setFilterCountry('all');
    setFilterCity('');
    setFilterType('all');
    setFilterMinMatch(0);
    setFilterHasEmail(false);
    setFilterHasPhone(false);
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Demo Mode Notice */}
      {showDemo && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between gap-3 text-tertiary shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <div>
              <span className="font-label-lg font-bold">Demo data is shown; these are not real businesses</span>
              <p className="font-body-md text-xs text-on-surface-variant">
                Simulated sandbox records. Outreach is blocked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0 transition-colors"
          >
            Hide Demo Data
          </button>
        </div>
      )}

      {/* OpenStreetMap Fair-use Attribution */}
      <div className="px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 text-[11px] text-on-surface-variant flex items-center justify-between gap-2 shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-primary">public</span>
          <span>Free Business Discovery: <strong>© OpenStreetMap contributors (ODbL)</strong></span>
        </span>
        <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant/40 font-mono">
          Fair-Use Compliant
        </span>
      </div>

      {/* Interactive Overview Banner (Stitch Live Radar) */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden border border-outline-variant/20">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-on-surface">
              Businesses Found
            </h1>
            {showDemo && (
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-badge text-xs uppercase tracking-wider font-bold">
                DEMO
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-secondary text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Live Radar</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
            <span>
              Showing <strong className="font-semibold text-on-surface">{sortedBusinesses.length} local opportunities</strong> discovered
            </span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Grid vs Table */}
            <div className="flex items-center rounded-lg bg-surface-container-high border border-outline-variant/30 p-0.5">
              <button
                type="button"
                onClick={() => handleToggleView('grid')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors min-h-[36px] min-w-[36px] ${
                  viewMode === 'grid'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Grid Card View"
                aria-label="Grid Card View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleView('table')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors min-h-[36px] min-w-[36px] ${
                  viewMode === 'table'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Table View (Power Users)"
                aria-label="Table View (Power Users)"
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
              </button>
            </div>

            {/* Mobile Filter Sheet Button */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs font-semibold flex items-center gap-1 min-h-[36px]"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Filters</span>
            </button>

            {/* Batch Safe Queue CTA */}
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-md active:opacity-90 transition-opacity min-h-[36px]"
            >
              <span className="material-symbols-outlined text-[16px]">outgoing_mail</span>
              <span>Queue safe emails for these leads</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Rail */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`filter-pill shrink-0 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all min-h-[36px] ${
              activeTab === 'all'
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">apps</span>
            <span>All ({counts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('no_website')}
            className={`filter-pill shrink-0 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all min-h-[36px] ${
              activeTab === 'no_website'
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-error">domain_disabled</span>
            <span>No Website ({counts.no_website})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broken_website')}
            className={`filter-pill shrink-0 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all min-h-[36px] ${
              activeTab === 'broken_website'
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">speed</span>
            <span>Broken / Slow ({counts.broken_website})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('needs_ai')}
            className={`filter-pill shrink-0 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all min-h-[36px] ${
              activeTab === 'needs_ai'
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
            <span>Needs AI ({counts.needs_ai})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hot_requests')}
            className={`filter-pill shrink-0 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all min-h-[36px] ${
              activeTab === 'hot_requests'
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">local_fire_department</span>
            <span>Hot ({counts.hot_requests})</span>
          </button>
        </div>
      </section>

      {/* Main Two-Column Structure on Laptop (Left Filter Panel + Results Canvas) */}
      {activeTab === 'hot_requests' ? (
        <ClientRequestsView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Filter Panel (Desktop Sticky Sidebar) */}
        <aside
          className={`lg:col-span-3 flex-col gap-4 bg-surface-container p-4 rounded-2xl border border-outline-variant/20 lg:sticky lg:top-20 ${
            showMobileFilters ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">filter_list</span>
              <h2 className="text-sm font-bold text-on-surface">Filter Results</h2>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Reset
            </button>
          </div>

          {/* Filter: Country */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant">Country</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-surface-container-low text-xs sm:text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">🌍 Worldwide / All Countries</option>
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="CA">Canada (CA)</option>
              <option value="AU">Australia (AU)</option>
              <option value="AE">United Arab Emirates (UAE)</option>
              <option value="SA">Saudi Arabia (KSA)</option>
              <option value="DE">Germany (DE)</option>
              <option value="FR">France (FR)</option>
              <option value="PK">Pakistan (PK)</option>
              <option value="IN">India (IN)</option>
              <option value="SG">Singapore (SG)</option>
            </select>
          </div>

          {/* Filter: City Search */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant">City or Locality</label>
            <input
              type="text"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="e.g. Manchester, London..."
              className="w-full h-9 px-2.5 rounded-lg bg-surface-container-low text-[16px] sm:text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter: Min Match Score */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Min Match Score</span>
              <span className="font-mono text-primary font-bold">{filterMinMatch}%+</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={filterMinMatch}
              onChange={(e) => setFilterMinMatch(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Filter: Contact Channels Available */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-xs font-semibold text-on-surface-variant">Channels Available</label>
            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterHasEmail}
                onChange={(e) => setFilterHasEmail(e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary"
              />
              <span>Has Verified Email</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterHasPhone}
                onChange={(e) => setFilterHasPhone(e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary"
              />
              <span>Has Verified Phone</span>
            </label>
          </div>
        </aside>

        {/* Results Canvas (Grid or Table View) */}
        <main className="lg:col-span-9 flex flex-col gap-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 bg-surface-container border border-outline-variant/20 animate-pulse flex flex-col gap-3 min-h-[180px]"
                >
                  <div className="h-4 bg-surface-container-highest rounded w-2/3"></div>
                  <div className="h-3 bg-surface-container-highest rounded w-1/3"></div>
                  <div className="h-12 bg-surface-container-lowest rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : sortedBusinesses.length === 0 ? (
            <div className="rounded-2xl p-10 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col items-center justify-center text-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
              <h2 className="text-base font-bold text-on-surface">No matching businesses found</h2>
              <p className="text-xs text-on-surface-variant max-w-sm">
                Try loosening your filters or click &ldquo;Find Businesses Now&rdquo; to crawl for more leads.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View (for power users on laptop, gracefully wraps) */
            <div className="rounded-2xl bg-surface-container border border-outline-variant/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-on-surface">
                  <thead className="bg-surface-container-high border-b border-outline-variant/30 text-on-surface-variant font-semibold select-none sticky top-0">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-on-surface"
                        onClick={() => {
                          setSortField('name');
                          setSortAsc(!sortAsc);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Business Name</span>
                          {sortField === 'name' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-on-surface hidden sm:table-cell"
                        onClick={() => {
                          setSortField('city');
                          setSortAsc(!sortAsc);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>City</span>
                          {sortField === 'city' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3">Status</th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-on-surface"
                        onClick={() => {
                          setSortField('score');
                          setSortAsc(!sortAsc);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Match</span>
                          {sortField === 'score' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3 hidden md:table-cell">Best Reach</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {sortedBusinesses.map((b, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const hasEmail = Boolean(b.contacts?.some((c) => c.email));
                      const hasPhone = Boolean(b.phone || b.contacts?.some((c) => c.phone));
                      const score = b.score?.overallScore || 85;

                      return (
                        <tr
                          key={b.id}
                          onClick={() => {
                            setHighlightedIndex(idx);
                            setSelectedBusiness(b);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-primary-container/15'
                              : 'hover:bg-surface-container-high/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-on-surface truncate max-w-[200px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{b.name}</span>
                              {showDemo && isDemo(b) && (
                                <span className="px-1.5 py-0.2 rounded-full bg-tertiary-container text-on-tertiary-container text-[9px] uppercase font-bold shrink-0">
                                  DEMO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-on-surface-variant hidden sm:table-cell truncate max-w-[120px]">
                            {b.city || 'Local'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest text-[11px] font-semibold border border-outline-variant/30">
                              {b.websiteCheck?.status === 'apparently_absent' ? 'No Website' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-primary">{score}%</span>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell text-on-surface-variant">
                            {hasEmail ? 'Email' : hasPhone ? 'Phone Call' : 'Social'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBusiness(b);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs transition-colors min-h-[36px]"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View (3 columns on laptop & desktop) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedBusinesses.map((b, idx) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setHighlightedIndex(idx);
                    setSelectedBusiness(b);
                  }}
                  className={`cursor-pointer transition-all ${
                    idx === highlightedIndex ? 'ring-2 ring-primary rounded-2xl' : ''
                  }`}
                >
                  <BusinessCard
                    business={b}
                    showDemoBadge={showDemo && isDemo(b)}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      )}

      {/* Right-Side Details Drawer (Slide-over on laptop, full-screen sheet on mobile) */}
      <BusinessDetailsDrawer
        business={selectedBusiness}
        isOpen={Boolean(selectedBusiness)}
        onClose={() => setSelectedBusiness(null)}
      />

      {/* Safe Batch Queue Modal */}
      {isBatchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface-container-high border border-outline-variant/30 p-6 shadow-2xl flex flex-col gap-4 text-on-surface">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">outgoing_mail</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Queue Safe Outreach Emails
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Only leads with a verified public email and passing all suppression guards will be queued.
                </p>
              </div>
            </div>

            {batchResult && (
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-secondary">Queued for Sending:</span>
                  <span className="text-sm font-mono">{batchResult.queued}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-error">Blocked by Safety:</span>
                  <span className="text-sm font-mono">{batchResult.blocked}</span>
                </div>
                {batchResult.reasons.length > 0 && (
                  <div className="pt-2 border-t border-outline-variant/20 text-on-surface-variant">
                    <p className="font-semibold mb-1">Safety rules applied:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {batchResult.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setBatchResult(null);
                }}
                className="px-4 py-2 rounded-xl border border-outline-variant/40 text-on-surface-variant font-semibold text-xs min-h-[44px]"
              >
                {batchResult ? 'Done' : 'Cancel'}
              </button>

              {!batchResult && (
                <button
                  type="button"
                  onClick={handleBatchQueue}
                  disabled={isBatchQueueing}
                  className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs shadow-md flex items-center gap-1.5 min-h-[44px]"
                >
                  {isBatchQueueing ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <span>Queue Verified Leads</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-on-surface-variant">
          Loading businesses radar...
        </div>
      }
    >
      <BusinessesContent />
    </Suspense>
  );
}
