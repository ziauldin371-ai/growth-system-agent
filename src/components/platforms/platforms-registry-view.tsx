'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlatformEntity, PlatformCategory, PlatformPriority, PlatformPitchMode, CountryEligibilityStatus, MyAccountStatus } from '@/types';
import { AddPlatformModal } from './add-platform-modal';
import { useToast } from '@/components/ui/toast-context';
import Link from 'next/link';

export function PlatformsRegistryView() {
  const { success, error: toastError } = useToast();
  const [platforms, setPlatforms] = useState<PlatformEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterPitchMode, setFilterPitchMode] = useState('all');
  const [filterEligibility, setFilterEligibility] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPlatforms = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterPitchMode !== 'all') params.set('pitchMode', filterPitchMode);
      if (filterEligibility !== 'all') params.set('countryEligibility', filterEligibility);
      if (filterAccount !== 'all') params.set('myAccountStatus', filterAccount);

      const res = await fetch(`/api/platforms?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.platforms)) {
        setPlatforms(data.platforms);
      }
    } catch {
      toastError('Could not load platforms registry.');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterCategory, filterPriority, filterPitchMode, filterEligibility, filterAccount, toastError]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleUpdateStatus = async (id: string, updates: Partial<PlatformEntity>) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/platforms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const data = await res.json();
      if (data.success) {
        success('Platform updated!');
        fetchPlatforms();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyTerms = async (p: PlatformEntity) => {
    // Open terms URL in new tab
    window.open(p.officialTermsUrl || p.url, '_blank', 'noopener,noreferrer');
    // Record verification
    setUpdatingId(p.id);
    try {
      const res = await fetch('/api/platforms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          action: 'verify_terms',
          verifiedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Terms verified for ${p.name}!`);
        fetchPlatforms();
      }
    } catch {
      toastError('Could not record terms verification.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getPlainPitchMode = (mode: PlatformPitchMode, cat: PlatformCategory) => {
    if (cat === 'marketplace') return 'Apply to posted projects';
    if (cat === 'vetted_network' || cat === 'expert_network') return 'Get vetted and matched';
    if (cat === 'lead_database' || cat === 'company_intel' || cat === 'b2b_directory') return 'Find companies to pitch';
    if (cat === 'contact_finder') return 'Find emails';
    if (mode === 'research_only') return 'Research only (cannot pitch here)';
    if (mode === 'matching_only') return 'Matching only';
    if (mode === 'connection_note') return 'LinkedIn note (<=300 chars)';
    if (mode === 'direct_message') return 'Direct message (DM)';
    if (mode === 'contact_form') return 'Website contact form';
    return 'Direct email outreach';
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-on-surface">Client-Acquisition Platform Registry</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-semibold">
              {platforms.length} Platforms
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Data-driven registry of marketplaces, vetted networks, lead databases, and directories for AI/ML client acquisition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/setup/applications"
            className="px-3.5 py-2 rounded-xl bg-surface-container-high text-xs font-semibold text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1.5 min-h-[40px]"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">assignment_turned_in</span>
            <span>Applications Tracker</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 flex items-center gap-1.5 min-h-[40px]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add Platform</span>
          </button>
        </div>
      </div>

      {/* Verification Reminder Callout */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-on-surface text-xs">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-amber-500 shrink-0">verified_user</span>
          <div>
            <span className="font-bold text-amber-500">Verify current terms before use</span>
            <p className="text-[11px] text-on-surface-variant">
              Cost, fees, and eligibility requirements evolve frequently. Click &ldquo;Verify Terms&rdquo; to open official policies and timestamp verification.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <section className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20 shadow-sm flex flex-col gap-3">
        <div className="relative">
          <span className="material-symbols-outlined text-[18px] text-outline absolute left-3 top-2.5">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms by name, AI/ML relevance, or client acquisition method..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30"
          >
            <option value="all">All Categories</option>
            <option value="marketplace">Marketplaces (Bidding)</option>
            <option value="vetted_network">Vetted Networks (Matching)</option>
            <option value="expert_network">Expert Networks</option>
            <option value="lead_database">Lead Databases</option>
            <option value="contact_finder">Email Finders</option>
            <option value="company_intel">Company Intel</option>
            <option value="b2b_directory">B2B Directories</option>
            <option value="startup_community">Startup Communities</option>
            <option value="social">Social Channels</option>
            <option value="local_business_directory">Local Business</option>
            <option value="job_feed">Job Feeds</option>
            <option value="tender_portal">Tender Portals</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <select
            value={filterPitchMode}
            onChange={(e) => setFilterPitchMode(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30"
          >
            <option value="all">All Pitch Modes</option>
            <option value="proposal">Proposals</option>
            <option value="application">Applications</option>
            <option value="matching_only">Matching Only</option>
            <option value="connection_note">LinkedIn Note</option>
            <option value="direct_message">Direct Message</option>
            <option value="email">Direct Email</option>
            <option value="research_only">Research Only</option>
          </select>

          <select
            value={filterEligibility}
            onChange={(e) => setFilterEligibility(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30"
          >
            <option value="all">All Country Status</option>
            <option value="eligible">Eligible</option>
            <option value="needs_check">Needs Check</option>
            <option value="not_eligible">Not Eligible</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30 col-span-2 sm:col-span-1"
          >
            <option value="all">All Account Status</option>
            <option value="none">No Account</option>
            <option value="profile_created">Profile Created</option>
            <option value="applied">Applied</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </section>

      {/* Platform Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span>Loading platforms registry...</span>
        </div>
      ) : platforms.length === 0 ? (
        <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/20">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2">search_off</span>
          <p className="text-sm font-semibold text-on-surface">No platforms match your active filters</p>
          <p className="text-xs text-on-surface-variant mt-1">Try resetting filters or adding a new platform above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => {
            const isTermsVerified = Boolean(p.lastVerified);
            const plainPitch = getPlainPitchMode(p.pitchMode, p.category);

            return (
              <div
                key={p.id}
                className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-3.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  {/* Top Bar with Name & Priority */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-on-surface">{p.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          p.priority === 'High' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {p.priority} Priority
                        </span>
                      </div>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>{p.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </div>

                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      {p.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Plain Language Pitch Job */}
                  <div className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex items-center gap-1.5 text-xs text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">play_arrow</span>
                    <span className="font-semibold">{plainPitch}</span>
                  </div>

                  {/* How to Get Clients */}
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2" title={p.howToGetClients}>
                    <strong className="text-on-surface">Action:</strong> {p.howToGetClients}
                  </p>

                  {/* AI/ML Relevance */}
                  <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2" title={p.aiMlRelevance}>
                    <strong className="text-on-surface">AI/ML:</strong> {p.aiMlRelevance}
                  </p>

                  {/* Cost & Access Notes */}
                  <div className="p-2 rounded-lg bg-surface-container-lowest text-[11px] text-on-surface-variant border border-outline-variant/20">
                    <span className="font-semibold text-on-surface">Cost: </span>
                    <span>{p.costAccessNotes || 'Verify current terms before use'}</span>
                  </div>
                </div>

                {/* Status Selectors & Verify Terms Button */}
                <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/20">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-on-surface-variant font-medium">My Account</label>
                      <select
                        value={p.myAccountStatus}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleUpdateStatus(p.id, { myAccountStatus: e.target.value as MyAccountStatus })}
                        className="h-7 px-1.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-[11px]"
                      >
                        <option value="none">None</option>
                        <option value="profile_created">Profile Created</option>
                        <option value="applied">Applied</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-on-surface-variant font-medium">Pakistan Status</label>
                      <select
                        value={p.countryEligibilityStatus}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleUpdateStatus(p.id, { countryEligibilityStatus: e.target.value as CountryEligibilityStatus })}
                        className="h-7 px-1.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-[11px]"
                      >
                        <option value="needs_check">Needs Check</option>
                        <option value="eligible">Eligible</option>
                        <option value="not_eligible">Not Eligible</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                    <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                      isTermsVerified ? 'text-secondary' : 'text-amber-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isTermsVerified ? 'bg-secondary' : 'bg-amber-500'}`}></span>
                      {isTermsVerified ? `Verified ${p.lastVerified?.split('T')[0]}` : 'Unverified terms'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleVerifyTerms(p)}
                      disabled={updatingId === p.id}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant text-[11px] font-bold text-primary flex items-center gap-1 transition-colors"
                      title={`Open official terms URL: ${p.officialTermsUrl}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      <span>Verify Terms</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Platform Modal */}
      <AddPlatformModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={() => fetchPlatforms()}
      />
    </div>
  );
}
