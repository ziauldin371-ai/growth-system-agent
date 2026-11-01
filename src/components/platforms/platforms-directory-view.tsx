'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';
import { PlatformItem, CLIENT_PLATFORMS, LOCAL_BUSINESS_CHANNELS } from '@/data/platforms-registry';
import {
  PlatformTrackerEntity,
  PlatformDailyTargetEntity,
  OperatorProfileEntity,
  PlatformTrackerStatus,
} from '@/types';
import {
  generatePlatformPitch,
  DEFAULT_OPERATOR_PROFILE,
  OperatorProfile,
} from '@/services/ai/platform-pitch-templates';

type GroupFilter = 'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
type ExtraFilter = 'all' | 'high_priority' | 'free_to_start' | 'pakistan_ok' | 'not_started' | 'applied';

const STATUS_CONFIG: Record<
  PlatformTrackerStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  not_started: {
    label: 'Not started',
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    icon: 'hourglass_empty',
  },
  profile_ready: {
    label: 'Profile ready',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    icon: 'badge',
  },
  applied: {
    label: 'Applied',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    icon: 'send',
  },
  proposals_sent: {
    label: 'Proposals sent',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    icon: 'outgoing_mail',
  },
  replied: {
    label: 'Replied',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    icon: 'mark_chat_read',
  },
  won: {
    label: 'Got a client',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    icon: 'military_tech',
  },
};

const CHECKLIST_ITEMS = [
  { id: 'headline', label: 'Compelling headline & positioning' },
  { id: 'bio', label: 'Clear 3-line problem-focused bio' },
  { id: 'portfolio', label: '3 verified portfolio / code links' },
  { id: 'rates', label: 'Defined hourly / project rates' },
  { id: 'skills', label: 'Tagged core skills (n8n, Make, Next.js, AI)' },
  { id: 'verification', label: 'Identity / phone verification completed' },
  { id: 'payout', label: 'Payout method configured (Payoneer / Wise)' },
] as const;

export function PlatformsDirectoryView() {
  const { t, language } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();

  const [platforms, setPlatforms] = useState<PlatformItem[]>(CLIENT_PLATFORMS);
  const [trackers, setTrackers] = useState<Record<string, PlatformTrackerEntity>>({});
  const [dailyTarget, setDailyTarget] = useState<PlatformDailyTargetEntity>({
    id: 'default',
    targetDate: new Date().toISOString().split('T')[0],
    targetCount: 5,
    completedCount: 0,
  });
  const [profile, setProfile] = useState<OperatorProfile>(DEFAULT_OPERATOR_PROFILE);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<GroupFilter>('all');
  const [activeExtraFilter, setActiveExtraFilter] = useState<ExtraFilter>('all');

  // Drawer / Sheet state
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformItem | null>(null);
  const [editedPitch, setEditedPitch] = useState<string>('');
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<OperatorProfile>(DEFAULT_OPERATOR_PROFILE);

  // Load live data from API
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/platforms');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.platforms) && data.platforms.length > 0) {
          setPlatforms(data.platforms);
        }
        if (data.trackers) setTrackers(data.trackers);
        if (data.dailyTarget) setDailyTarget(data.dailyTarget);
        if (data.profile) {
          setProfile(data.profile);
          setProfileDraft(data.profile);
        }
      }
    } catch (e) {
      console.error('Failed to load platforms:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected platform changes, compute pitch
  useEffect(() => {
    if (selectedPlatform) {
      const tracker = trackers[selectedPlatform.id];
      if (tracker?.customPitch) {
        setEditedPitch(tracker.customPitch);
      } else {
        const pitchRes = generatePlatformPitch(selectedPlatform, profile);
        setEditedPitch(pitchRes.text);
      }
      setIsEditingPitch(false);
    }
  }, [selectedPlatform, profile, trackers]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toastSuccess(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      toastError('Could not copy to clipboard.');
    }
  };

  // Save tracker updates
  const handleUpdateTracker = async (
    platformId: string,
    updates: Partial<PlatformTrackerEntity>
  ) => {
    try {
      const res = await fetch('/api/platforms/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, ...updates }),
      });
      const data = await res.json();
      if (data.success && data.tracker) {
        setTrackers((prev) => ({
          ...prev,
          [platformId]: data.tracker,
        }));
        if (data.dailyTarget) {
          setDailyTarget(data.dailyTarget);
        }
        toastSuccess('Tracker updated!');
      }
    } catch {
      toastError('Failed to save status update.');
    }
  };

  // Quick action: mark applied / replied / won
  const handleQuickStatus = async (platformId: string, status: PlatformTrackerStatus) => {
    await handleUpdateTracker(platformId, {
      status,
      lastActionDate: new Date().toISOString(),
    });
  };

  // Checklist toggle
  const handleToggleChecklist = async (platformId: string, itemKey: string) => {
    const current = trackers[platformId]?.checklist || {};
    const updatedChecklist = {
      ...current,
      [itemKey]: !current[itemKey as keyof typeof current],
    };
    await handleUpdateTracker(platformId, {
      checklist: updatedChecklist,
    });
  };

  // Increment daily proposal count
  const handleIncrementDailyTarget = async () => {
    try {
      const res = await fetch('/api/platforms/daily-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment' }),
      });
      const data = await res.json();
      if (data.success && data.dailyTarget) {
        setDailyTarget(data.dailyTarget);
        toastSuccess('Daily proposal logged!');
      }
    } catch {
      toastError('Failed to update daily count.');
    }
  };

  // Save operator profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platforms/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDraft),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setIsProfileModalOpen(false);
        toastSuccess('Operator profile saved!');
      }
    } catch {
      toastError('Failed to save profile.');
    }
  };

  // Filtered platforms
  const filteredPlatforms = useMemo(() => {
    return platforms.filter((p) => {
      // Group filter
      if (activeGroup !== 'all' && p.group !== activeGroup) return false;

      const trk = trackers[p.id];
      const status = trk?.status || 'not_started';

      // Extra filter
      if (activeExtraFilter === 'high_priority' && p.priority !== 'High') return false;
      if (activeExtraFilter === 'free_to_start' && !p.freeToStart) return false;
      if (activeExtraFilter === 'pakistan_ok' && p.pakistanEligibility !== 'OK') return false;
      if (activeExtraFilter === 'not_started' && status !== 'not_started') return false;
      if (activeExtraFilter === 'applied' && status !== 'applied') return false;

      // Text search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesHow = p.howClientsFound.toLowerCase().includes(q);
        const matchesGroup = p.groupName.toLowerCase().includes(q);
        const matchesPitch = p.pitchType.toLowerCase().includes(q);
        if (!matchesName && !matchesHow && !matchesGroup && !matchesPitch) return false;
      }

      return true;
    });
  }, [platforms, activeGroup, activeExtraFilter, searchTerm, trackers]);

  // Group counts
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: platforms.length };
    for (const p of platforms) {
      counts[p.group] = (counts[p.group] || 0) + 1;
    }
    return counts;
  }, [platforms]);

  // Check if profile is missing links
  const hasEmptyPortfolio = useMemo(() => {
    return (profile.portfolioLinks || []).every((l) => !l || l.trim().length === 0);
  }, [profile]);

  const targetPct = Math.min(
    100,
    Math.round((dailyTarget.completedCount / (dailyTarget.targetCount || 5)) * 100)
  );

  return (
    <div className="flex flex-col gap-6 pb-16 max-w-[1440px] mx-auto w-full">
      {/* 1. Header & Context Banner */}
      <section className="bg-surface-container rounded-2xl p-5 sm:p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">hub</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
                Find Clients on Platforms
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                68 Verified Platforms
              </span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              These are places where clients look for experts. Pick a platform, copy the ready pitch, open the platform and send it yourself. Nothing is sent automatically from here.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setProfileDraft(profile);
                setIsProfileModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-outline-variant/40 flex items-center gap-1.5 min-h-[44px] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
              <span>My Profile &amp; Services</span>
              {hasEmptyPortfolio && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Missing portfolio" />
              )}
            </button>
          </div>
        </div>

        {/* Missing Portfolio Warning Banner */}
        {hasEmptyPortfolio && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>
                <strong>Action Needed:</strong> Add your portfolio link in My Profile to display your proof link in generated pitches.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileDraft(profile);
                setIsProfileModalOpen(true);
              }}
              className="text-xs font-bold underline hover:text-white"
            >
              Update Profile Now →
            </button>
          </div>
        )}

        {/* Daily Target Bar (default 5 proposals) */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">flag</span>
                Daily Target: Send {dailyTarget.targetCount || 5} proposals today
              </span>
              <span className="font-mono text-on-surface-variant font-bold">
                {dailyTarget.completedCount} / {dailyTarget.targetCount || 5} completed ({targetPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-300 rounded-full"
                style={{ width: `${targetPct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleIncrementDailyTarget}
            className="px-3.5 py-2 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 min-h-[44px] shrink-0"
            title="Log one proposal sent today"
          >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            <span>+1 Proposal Sent</span>
          </button>
        </div>
      </section>

      {/* 2. Filter Bar & Search */}
      <section className="flex flex-col gap-3">
        {/* Search input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by platform name, skill, or how clients are found..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Primary Group Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: `All (${groupCounts.all || 68})` },
            { id: 'A', label: `Marketplaces (${groupCounts.A || 14})` },
            { id: 'B', label: `Vetted networks (${groupCounts.B || 13})` },
            { id: 'C', label: `AI-specific (${groupCounts.C || 3})` },
            { id: 'D', label: `Automation & directories (${groupCounts.D || 7})` },
            { id: 'E', label: `Lead databases (${groupCounts.E || 12})` },
            { id: 'F', label: `Company research (${groupCounts.F || 13})` },
            { id: 'G', label: `Communities (${groupCounts.G || 3})` },
            { id: 'H', label: `Sending tools (${groupCounts.H || 3})` },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveGroup(chip.id as GroupFilter)}
              className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all min-h-[44px] flex items-center ${
                activeGroup === chip.id
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/20'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Secondary Extra Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          <span className="text-outline uppercase tracking-wider font-bold shrink-0 text-[10px] mr-1">
            Filter by:
          </span>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'high_priority', label: '🔥 High Priority' },
            { id: 'free_to_start', label: 'Free to start' },
            { id: 'pakistan_ok', label: 'Pakistan OK' },
            { id: 'not_started', label: 'Not started' },
            { id: 'applied', label: 'Applied' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveExtraFilter(chip.id as ExtraFilter)}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors min-h-[36px] ${
                activeExtraFilter === chip.id
                  ? 'bg-secondary-container text-on-secondary-container font-bold'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Platform Cards Grid (3 cols on laptop, 1 col on mobile) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-sm text-on-surface-variant bg-surface-container rounded-2xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary block mb-2 mx-auto">
              progress_activity
            </span>
            <span>Loading verified platforms...</span>
          </div>
        ) : filteredPlatforms.length === 0 ? (
          <div className="col-span-full p-12 text-center text-sm text-on-surface-variant bg-surface-container rounded-2xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-[32px] text-outline block mb-2 mx-auto">
              search_off
            </span>
            <span className="font-bold text-on-surface block mb-1">No platforms match this filter</span>
            <span className="text-xs">Try selecting &ldquo;All&rdquo; or clearing your search term.</span>
          </div>
        ) : (
          filteredPlatforms.map((platform) => {
            const trk = trackers[platform.id];
            const currentStatus: PlatformTrackerStatus = trk?.status || 'not_started';
            const statusMeta = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.not_started;

            return (
              <div
                key={platform.id}
                className="bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/20 hover:border-outline-variant/40 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-outline block">
                        Group {platform.group} · {platform.groupName}
                      </span>
                      <h3 className="text-base font-bold text-on-surface mt-0.5">{platform.name}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          platform.priority === 'High'
                            ? 'bg-rose-500/15 text-rose-400'
                            : platform.priority === 'Medium'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {platform.priority}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                    {platform.howClientsFound}
                  </p>
                </div>

                {/* Status chip & badges */}
                <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}
                      >
                        <span className="material-symbols-outlined text-[12px]">{statusMeta.icon}</span>
                        <span>{statusMeta.label}</span>
                      </span>

                      {platform.freeToStart && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                          Free
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-outline">
                      {platform.whatISend}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform(platform)}
                      className="px-3 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-95 min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit_note</span>
                      <span>View pitch</span>
                    </button>

                    <a
                      href={platform.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center justify-center gap-1 border border-outline-variant/30 min-h-[44px]"
                    >
                      <span>Open site</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 4. Details Drawer (Laptop) / Full Screen Sheet (Phone) */}
      {selectedPlatform && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setSelectedPlatform(null)}
        >
          <div
            className="w-full sm:max-w-xl md:max-w-2xl bg-surface-container h-full overflow-y-auto p-5 sm:p-6 border-l border-outline-variant/30 shadow-2xl flex flex-col justify-between gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Group {selectedPlatform.group} · {selectedPlatform.groupName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        selectedPlatform.priority === 'High'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {selectedPlatform.priority} Priority
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface mt-1">{selectedPlatform.name}</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">{selectedPlatform.howClientsFound}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlatform(null)}
                  className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center min-h-[44px] min-w-[44px]"
                  aria-label="Close drawer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Status and Action Buttons */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface">Application Status:</span>
                  <select
                    value={trackers[selectedPlatform.id]?.status || 'not_started'}
                    onChange={(e) =>
                      handleQuickStatus(selectedPlatform.id, e.target.value as PlatformTrackerStatus)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                  >
                    <option value="not_started">Not started</option>
                    <option value="profile_ready">Profile ready</option>
                    <option value="applied">Applied</option>
                    <option value="proposals_sent">Proposals sent</option>
                    <option value="replied">Replied</option>
                    <option value="won">Got a client</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-outline-variant/10 text-[11px]">
                  <span className="text-outline">Quick mark:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(selectedPlatform.id, 'applied')}
                    className="px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 font-semibold"
                  >
                    Mark Applied
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(selectedPlatform.id, 'proposals_sent')}
                    className="px-2 py-1 rounded bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 font-semibold"
                  >
                    Mark Proposals Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(selectedPlatform.id, 'won')}
                    className="px-2 py-1 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 font-semibold"
                  >
                    Mark Won
                  </button>
                </div>
              </div>

              {/* Ready Pitch Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Ready pitch</h3>
                    <span className="text-[11px] text-on-surface-variant">
                      Format: {selectedPlatform.pitchType}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const regenerated = generatePlatformPitch(selectedPlatform, profile);
                        setEditedPitch(regenerated.text);
                        toastSuccess('Pitch regenerated from profile!');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1"
                      title="Reset or regenerate using your profile"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Regenerate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditingPitch(!isEditingPitch)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isEditingPitch ? 'check' : 'edit'}
                      </span>
                      <span>{isEditingPitch ? 'Done' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(editedPitch, `pitch_${selectedPlatform.id}`, 'Pitch')
                      }
                      className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-bold flex items-center gap-1 shadow-sm active:opacity-90 min-h-[36px]"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === `pitch_${selectedPlatform.id}` ? 'check' : 'content_copy'}
                      </span>
                      <span>
                        {copiedKey === `pitch_${selectedPlatform.id}` ? 'Copied!' : 'Copy Pitch'}
                      </span>
                    </button>
                  </div>
                </div>

                {isEditingPitch ? (
                  <textarea
                    rows={8}
                    value={editedPitch}
                    onChange={(e) => setEditedPitch(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-surface-container-low border border-primary/40 font-mono text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm text-on-surface font-sans whitespace-pre-wrap leading-relaxed select-text">
                    {editedPitch}
                  </div>
                )}

                {/* Platform Rules Disclaimer */}
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-[11px] text-on-surface-variant flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary shrink-0">gavel</span>
                  <span>{generatePlatformPitch(selectedPlatform, profile).platformRules}</span>
                </div>
              </div>

              {/* How to get clients here (4-6 steps) */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">checklist</span>
                  How to get clients here
                </h3>
                <div className="space-y-2">
                  {selectedPlatform.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 text-xs text-on-surface flex items-start gap-2.5 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile Checklist */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">task_alt</span>
                  Profile Checklist
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map((item) => {
                    const isChecked = Boolean(
                      trackers[selectedPlatform.id]?.checklist?.[item.id as keyof typeof trackers[string]['checklist']]
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleChecklist(selectedPlatform.id, item.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2 transition-colors min-h-[44px] ${
                          isChecked
                            ? 'bg-primary-container/15 border-primary/30 text-on-surface font-semibold'
                            : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            isChecked ? 'text-primary' : 'text-outline'
                          }`}
                        >
                          {isChecked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Ideas */}
              {selectedPlatform.searchIdeas && selectedPlatform.searchIdeas.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">search_insights</span>
                    Search ideas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlatform.searchIdeas.map((idea, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs flex items-center gap-2"
                      >
                        <span className="text-on-surface font-medium">{idea.label}:</span>
                        <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px]">
                          {idea.query}
                        </code>
                        {idea.searchUrl ? (
                          <a
                            href={idea.searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5 font-bold"
                          >
                            <span>Open</span>
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(idea.query, `search_${idx}`, 'Search phrase')
                            }
                            className="text-outline hover:text-on-surface"
                            title="Copy query phrase"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedKey === `search_${idx}` ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pakistan Eligibility & Cost Notes */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface">Pakistan eligibility:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-outline">{selectedPlatform.pakistanEligibility}</span>
                    <a
                      href={selectedPlatform.pakistanTermsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px] font-semibold"
                    >
                      <span>Check on site</span>
                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
                  <span>Cost / fees:</span>
                  <span className="font-medium text-on-surface text-right max-w-[280px]">
                    {selectedPlatform.costFees}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-3">
              <a
                href={selectedPlatform.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 min-h-[44px]"
              >
                <span>Open {selectedPlatform.name}</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedPlatform(null)}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. My Profile & Services Modal */}
      {isProfileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-container rounded-2xl p-5 sm:p-6 border border-outline-variant/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                <h3 className="font-bold text-base text-on-surface">My Profile &amp; Services</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pitches use this data. Never fabricates clients, certificates, or numbers. Empty fields show a visible hint.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-on-surface mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Headline</label>
                <input
                  type="text"
                  value={profileDraft.headline}
                  onChange={(e) => setProfileDraft({ ...profileDraft, headline: e.target.value })}
                  placeholder="e.g. Solo AI, Automation & Web Developer"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Services</label>
                <textarea
                  rows={2}
                  value={profileDraft.services}
                  onChange={(e) => setProfileDraft({ ...profileDraft, services: e.target.value })}
                  placeholder="e.g. AI automation (n8n, Make, Zapier workflows), LLM / RAG / chatbot integrations, websites and web apps"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">
                  3 Portfolio Links
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="url"
                      value={profileDraft.portfolioLinks?.[idx] || ''}
                      onChange={(e) => {
                        const updated = [...(profileDraft.portfolioLinks || ['', '', ''])];
                        updated[idx] = e.target.value;
                        setProfileDraft({ ...profileDraft, portfolioLinks: updated });
                      }}
                      placeholder={`Link ${idx + 1} (e.g. https://github.com/...)`}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-on-surface mb-1">Rate Range</label>
                  <input
                    type="text"
                    value={profileDraft.rateRange}
                    onChange={(e) => setProfileDraft({ ...profileDraft, rateRange: e.target.value })}
                    placeholder="$35 - $65 / hr"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">Availability</label>
                  <input
                    type="text"
                    value={profileDraft.availability}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, availability: e.target.value })
                    }
                    placeholder="20-30 hrs/week"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-on-surface mb-1">Short Bio</label>
                <textarea
                  rows={2}
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 min-h-[44px]"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
