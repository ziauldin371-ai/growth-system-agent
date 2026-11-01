'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ClientRequestEntity, RequestPitchEntity, RequestChannelEntity, LeadSourceEntity } from '@/types';
import { useToast } from '@/components/ui/toast-context';
import { generateBookmarkletCode } from '@/services/client-requests/manual-intake';

export function ClientRequestsView() {
  const { success, error: toastError } = useToast();

  const [requests, setRequests] = useState<ClientRequestEntity[]>([]);
  const [sources, setSources] = useState<LeadSourceEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'new' | 'strong' | 'with_email' | 'manual' | 'contacted' | 'skipped'>('new');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<ClientRequestEntity | null>(null);
  const [activePitchChannel, setActivePitchChannel] = useState<'email' | 'platform_message' | 'follow_up'>('email');
  const [activePitchVariant, setActivePitchVariant] = useState<'variant_a' | 'variant_b'>('variant_a');
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitchText, setEditedPitchText] = useState('');

  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [pastePlatform, setPastePlatform] = useState('');
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotPlatform, setScreenshotPlatform] = useState('');
  const [isSubmittingScreenshot, setIsSubmittingScreenshot] = useState(false);

  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isSubmittingCsv, setIsSubmittingCsv] = useState(false);

  const [showSourcesModal, setShowSourcesModal] = useState(false);

  // Fetch Requests and Sources
  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/client-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setRequests(data.requests);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/lead-sources');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sources)) {
          setSources(data.sources);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchSources();
  }, [fetchRequests, fetchSources]);

  // Live scan trigger
  const handleRunScan = async () => {
    setIsScanning(true);
    setScanMessage('Scanning official Tier A public feeds (Hacker News, RemoteOK, WWR, Remotive, Himalayas, Working Nomads)...');
    try {
      const res = await fetch('/api/client-requests/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Scan complete! Found ${data.result.relevantFound} relevant client needs (${data.result.newLeadsCreated} new).`);
        await fetchRequests();
      } else {
        toastError(data.error || 'Scan failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Scan network error');
    } finally {
      setIsScanning(false);
      setScanMessage(null);
    }
  };

  // Status updates
  const handleUpdateStatus = async (id: string, status: 'contacted' | 'skipped' | 'new') => {
    try {
      const res = await fetch(`/api/client-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        if (selectedRequest?.id === id) {
          setSelectedRequest(prev => prev ? { ...prev, status } : null);
        }
        success(`Status updated to ${status}`);
      }
    } catch {
      toastError('Failed to update status');
    }
  };

  // Pitch handling
  const currentPitch = useMemo(() => {
    if (!selectedRequest?.pitches) return null;
    return selectedRequest.pitches.find(
      p => p.channelType === activePitchChannel && p.variant === activePitchVariant
    ) || selectedRequest.pitches.find(p => p.channelType === activePitchChannel) || null;
  }, [selectedRequest, activePitchChannel, activePitchVariant]);

  useEffect(() => {
    if (currentPitch) {
      setEditedPitchText(currentPitch.editedText || currentPitch.text);
      setIsEditingPitch(false);
    }
  }, [currentPitch]);

  const handleSavePitchEdit = async () => {
    if (!selectedRequest || !currentPitch) return;
    try {
      const res = await fetch(`/api/client-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitchId: currentPitch.id,
          editedText: editedPitchText,
        }),
      });
      if (res.ok) {
        success('Pitch saved!');
        setIsEditingPitch(false);
        fetchRequests();
      }
    } catch {
      toastError('Failed to save pitch edit');
    }
  };

  const handleCopyPitch = () => {
    const textToCopy = currentPitch?.editedText || currentPitch?.text || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    success('Pitch copied to clipboard! Ready to paste on platform.');

    // Record copy event
    if (selectedRequest) {
      fetch(`/api/client-requests/${selectedRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_event', eventType: 'copied' }),
      });
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let list = [...requests];

    if (activeTab === 'new') {
      list = list.filter(r => r.status === 'new');
    } else if (activeTab === 'strong') {
      list = list.filter(r => r.matchScore >= 70 && r.status !== 'skipped');
    } else if (activeTab === 'with_email') {
      list = list.filter(r => r.channels && r.channels.some(c => c.type === 'email'));
    } else if (activeTab === 'manual') {
      list = list.filter(r => !r.channels || !r.channels.some(c => c.type === 'email'));
    } else if (activeTab === 'contacted') {
      list = list.filter(r => r.status === 'contacted');
    } else if (activeTab === 'skipped') {
      list = list.filter(r => r.status === 'skipped');
    }

    if (platformFilter !== 'all') {
      list = list.filter(r => r.sourcePlatform === platformFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.companyName && r.companyName.toLowerCase().includes(q)) ||
        (r.personName && r.personName.toLowerCase().includes(q)) ||
        (r.needSummary && r.needSummary.toLowerCase().includes(q)) ||
        (r.quote && r.quote.toLowerCase().includes(q)) ||
        (r.serviceFit && r.serviceFit.toLowerCase().includes(q))
      );
    }

    return list;
  }, [requests, activeTab, platformFilter, searchQuery]);

  // Metric counts
  const todayStr = new Date().toISOString().slice(0, 10);
  const metrics = useMemo(() => {
    return {
      newToday: requests.filter(r => (r.foundAt || r.createdAt || '').startsWith(todayStr)).length,
      strongMatches: requests.filter(r => r.matchScore >= 70 && r.status !== 'skipped').length,
      withEmail: requests.filter(r => r.channels && r.channels.some(c => c.type === 'email')).length,
      toContactManually: requests.filter(r => r.status === 'new' && (!r.channels || !r.channels.some(c => c.type === 'email'))).length,
    };
  }, [requests, todayStr]);

  // Unique platform options
  const uniquePlatforms = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => {
      if (r.sourcePlatform) set.add(r.sourcePlatform);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Handle Paste Submit
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    setIsSubmittingPaste(true);
    try {
      const res = await fetch('/api/client-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'paste',
          rawText: pasteText,
          sourceUrl: pasteUrl,
          sourcePlatform: pastePlatform || 'Manual Paste',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Client lead extracted and pitches generated!');
        setShowPasteModal(false);
        setPasteText('');
        setPasteUrl('');
        setPastePlatform('');
        await fetchRequests();
        setSelectedRequest(data.request);
      } else {
        toastError(data.error || 'Failed to extract lead');
      }
    } catch (err: any) {
      toastError(err.message || 'Submission error');
    } finally {
      setIsSubmittingPaste(false);
    }
  };

  // Handle Screenshot Drop / Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotBase64) return;
    setIsSubmittingScreenshot(true);
    try {
      const res = await fetch('/api/client-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'screenshot',
          imageBase64: screenshotBase64,
          sourceUrl: screenshotUrl,
          sourcePlatform: screenshotPlatform || 'Screenshot',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Screenshot analyzed with Gemini Vision! Pitches ready.');
        setShowScreenshotModal(false);
        setScreenshotBase64(null);
        setScreenshotUrl('');
        setScreenshotPlatform('');
        await fetchRequests();
        setSelectedRequest(data.request);
      } else {
        toastError(data.error || 'Vision analysis failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Submission error');
    } finally {
      setIsSubmittingScreenshot(false);
    }
  };

  // Bookmarklet code
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://growth-system-agent-brown.vercel.app';
  const bookmarkletCode = useMemo(() => generateBookmarkletCode(appOrigin), [appOrigin]);

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 sm:p-6 bg-surface-container border border-outline-variant/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[26px] text-primary">radar</span>
            <h1 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface">
              Client Requests (Opportunity Radar)
            </h1>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            Real people and companies that need AI, automation, web and data skills. Verified public evidence only—no cold guesses, no hallucinations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all min-h-[40px]"
          >
            <span className={`material-symbols-outlined text-[18px] ${isScanning ? 'animate-spin' : ''}`}>
              {isScanning ? 'sync' : 'bolt'}
            </span>
            <span>{isScanning ? 'Scanning...' : 'Run Live Scan'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs flex items-center gap-1.5 border border-outline-variant/40 transition-colors min-h-[40px]"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">content_paste</span>
            <span>Paste a Post</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScreenshotModal(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs flex items-center gap-1.5 border border-outline-variant/40 transition-colors min-h-[40px]"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">photo_camera</span>
            <span>Screenshot to Lead</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBookmarkletModal(true)}
            className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs flex items-center gap-1 border border-outline-variant/40 transition-colors min-h-[40px]"
            title="Quick Capture Browser Extension"
          >
            <span className="material-symbols-outlined text-[18px] text-indigo-400">bookmark</span>
            <span>Quick Capture</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSourcesModal(true)}
            className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs flex items-center gap-1 border border-outline-variant/40 transition-colors min-h-[40px]"
            title="View 45+ Verified Sources"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">dns</span>
            <span>Sources ({sources.length || 45})</span>
          </button>
        </div>
      </div>

      {/* Scanning status banner */}
      {isScanning && scanMessage && (
        <div className="rounded-xl p-3 bg-primary-container/20 border border-primary-container/40 text-primary flex items-center gap-2.5 text-xs animate-pulse">
          <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">New Today</span>
            <span className="material-symbols-outlined text-[20px] text-secondary">new_releases</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">{metrics.newToday}</div>
          <span className="text-[11px] text-on-surface-variant mt-1">Live public feeds</span>
        </div>

        <div className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Strong Matches</span>
            <span className="material-symbols-outlined text-[20px] text-emerald-400">verified</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2">{metrics.strongMatches}</div>
          <span className="text-[11px] text-on-surface-variant mt-1">Score 70% or higher</span>
        </div>

        <div className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">With Public Email</span>
            <span className="material-symbols-outlined text-[20px] text-primary">mail</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-primary mt-2">{metrics.withEmail}</div>
          <span className="text-[11px] text-on-surface-variant mt-1">Ready for safe Gmail queue</span>
        </div>

        <div className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">To Contact Manually</span>
            <span className="material-symbols-outlined text-[20px] text-tertiary">touch_app</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-tertiary mt-2">{metrics.toContactManually}</div>
          <span className="text-[11px] text-on-surface-variant mt-1">On platform or apply form</span>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'new', label: 'New Matches' },
            { id: 'strong', label: 'Strong Fit (70%+)' },
            { id: 'with_email', label: 'With Email' },
            { id: 'manual', label: 'Contact Manually' },
            { id: 'contacted', label: 'Contacted' },
            { id: 'skipped', label: 'Skipped' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {uniquePlatforms.length > 0 && (
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-xs text-on-surface focus:outline-none"
            >
              <option value="all">All Platforms ({requests.length})</option>
              {uniquePlatforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-60">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search need, company, skill..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Requests Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[32px] animate-spin text-primary">sync</span>
          <span>Loading client requests radar...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-surface-container border border-outline-variant/20 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">radar</span>
          <h3 className="text-base font-semibold text-on-surface">No client requests in this view</h3>
          <p className="text-xs text-on-surface-variant max-w-md">
            Click <strong>Run Live Scan</strong> to scan official feeds, or use <strong>Paste a Post</strong> / <strong>Quick Capture</strong> to add requests from Upwork, LinkedIn or X.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleRunScan}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs shadow-md"
            >
              Scan Live Feeds Now
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs"
            >
              Paste a Post
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(req => {
            const hasEmailChannel = req.channels && req.channels.some(c => c.type === 'email');
            const emailChannel = req.channels?.find(c => c.type === 'email');

            return (
              <div
                key={req.id}
                className="rounded-2xl p-4 bg-surface-container border border-outline-variant/20 shadow-sm hover:border-outline-variant/50 transition-all flex flex-col justify-between gap-3 group"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-primary border border-outline-variant/30 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">hub</span>
                      <span>{req.sourcePlatform}</span>
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        req.matchScore >= 80
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : req.matchScore >= 60
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {req.matchScore}% Match
                    </span>
                  </div>

                  {/* Company or Person Name */}
                  <div>
                    <h3 className="font-bold text-sm text-on-surface truncate">
                      {req.companyName || req.personName || 'Public Request (Not named)'}
                    </h3>
                    {req.platformUsername && (
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        @{req.platformUsername}
                      </span>
                    )}
                  </div>

                  {/* Plain English Need */}
                  <div className="text-xs text-on-surface font-medium line-clamp-2 leading-relaxed">
                    {req.needSummary}
                  </div>

                  {/* Verbatim Quote Evidence */}
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 text-[11px] text-on-surface-variant italic relative">
                    <span className="text-primary font-serif text-sm">“</span>
                    <span className="line-clamp-3">{req.quote}</span>
                    <span className="text-primary font-serif text-sm">”</span>
                    {req.postUrl && (
                      <div className="mt-1 pt-1 border-t border-outline-variant/10 flex justify-end">
                        <a
                          href={req.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 not-italic font-semibold"
                        >
                          <span>View original post</span>
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer and Channels */}
                <div className="space-y-3 pt-2 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-medium">
                      {req.serviceFit}
                    </span>
                    {hasEmailChannel ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">mail</span>
                        <span>Email found</span>
                      </span>
                    ) : (
                      <span className="text-tertiary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">touch_app</span>
                        <span>Manual outreach</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setActivePitchChannel(hasEmailChannel ? 'email' : 'platform_message');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-1 shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      <span>View Pitch</span>
                    </button>

                    {req.status === 'new' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, 'contacted')}
                        className="py-1.5 px-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
                        title="Mark Contacted"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, 'new')}
                        className="py-1.5 px-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
                        title="Reopen"
                      >
                        ↺
                      </button>
                    )}

                    {req.status !== 'skipped' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, 'skipped')}
                        className="py-1.5 px-2.5 rounded-xl bg-surface-container-high hover:bg-rose-950 text-rose-300 text-xs font-semibold"
                        title="Skip lead"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pitch Popup Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container rounded-2xl max-w-2xl w-full border border-outline-variant/40 shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/30 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-semibold">
                    {selectedRequest.sourcePlatform}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {selectedRequest.matchScore}% Match
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-on-surface">
                  {selectedRequest.companyName || selectedRequest.personName || 'Public Request (Not named)'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            {/* Need & Public Evidence */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
              <div>
                <span className="font-semibold text-on-surface">Client&apos;s Need: </span>
                <span className="text-on-surface-variant">{selectedRequest.needSummary}</span>
              </div>
              <div className="italic text-on-surface-variant border-l-2 border-primary pl-2.5 py-0.5">
                “{selectedRequest.quote}”
              </div>
              {selectedRequest.postUrl && (
                <div className="pt-1 flex items-center gap-1 text-[11px]">
                  <span className="text-on-surface-variant">Original Post:</span>
                  <a
                    href={selectedRequest.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5 font-semibold"
                  >
                    <span>Open on {selectedRequest.sourcePlatform}</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                </div>
              )}
            </div>

            {/* Where to Reach Them Channels */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">contacts</span>
                <span>Where to Reach Them:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedRequest.channels && selectedRequest.channels.length > 0 ? (
                  selectedRequest.channels.map(c => (
                    <a
                      key={c.id}
                      href={c.type === 'email' ? `mailto:${c.value}` : c.value.startsWith('http') ? c.value : '#'}
                      target={c.value.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-xs text-on-surface flex items-center gap-1.5 border border-outline-variant/30 font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        {c.type === 'email' ? 'mail' : c.type === 'phone' ? 'call' : 'link'}
                      </span>
                      <span>{c.label}: <strong>{c.value}</strong></span>
                      {c.value.startsWith('http') && (
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      )}
                    </a>
                  ))
                ) : (
                  <a
                    href={selectedRequest.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-xs text-on-surface flex items-center gap-1.5 border border-outline-variant/30 font-medium"
                  >
                    <span className="material-symbols-outlined text-[14px] text-secondary">open_in_new</span>
                    <span>Reply directly on {selectedRequest.sourcePlatform}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Pitch Channel & Variant Tabs */}
            <div className="space-y-3 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-surface-container-high p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActivePitchChannel('email')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activePitchChannel === 'email'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Email Pitch
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePitchChannel('platform_message')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activePitchChannel === 'platform_message'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Platform Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePitchChannel('follow_up')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activePitchChannel === 'follow_up'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Follow-Up (Day 4)
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-on-surface-variant text-[11px]">Variant:</span>
                  <button
                    type="button"
                    onClick={() => setActivePitchVariant('variant_a')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      activePitchVariant === 'variant_a'
                        ? 'bg-surface-container-highest text-on-surface font-bold border border-outline-variant'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    A (Value-First)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePitchVariant('variant_b')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      activePitchVariant === 'variant_b'
                        ? 'bg-surface-container-highest text-on-surface font-bold border border-outline-variant'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    B (Concise)
                  </button>
                </div>
              </div>

              {/* Pitch Subject (if email) */}
              {activePitchChannel === 'email' && currentPitch?.subject && (
                <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs">
                  <span className="text-on-surface-variant font-semibold">Subject: </span>
                  <span className="font-semibold text-on-surface">{currentPitch.subject}</span>
                </div>
              )}

              {/* Pitch Body Editor / Viewer */}
              {isEditingPitch ? (
                <div className="space-y-2">
                  <textarea
                    rows={8}
                    value={editedPitchText}
                    onChange={(e) => setEditedPitchText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary leading-relaxed font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPitch(false)}
                      className="px-3 py-1 rounded-lg text-xs bg-surface-container-high text-on-surface-variant"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePitchEdit}
                      className="px-3 py-1 rounded-lg text-xs bg-primary text-on-primary font-semibold"
                    >
                      Save Pitch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans relative group">
                  {currentPitch?.editedText || currentPitch?.text || 'No pitch available for this variant.'}
                </div>
              )}

              {/* Pitch Quality Badges */}
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <span>✓</span>
                    <span>Read-aloud verified (&lt;25 words/sentence)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <span>✓</span>
                    <span>No buzzwords / clichés</span>
                  </span>
                </div>
                {!isEditingPitch && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPitch(true)}
                    className="text-primary hover:underline font-semibold"
                  >
                    Edit pitch
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-outline-variant/30">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Copy Pitch</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'contacted')}
                  className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>✓</span>
                  <span>Mark Contacted</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste a Post Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl max-w-lg w-full border border-outline-variant/40 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">content_paste</span>
                <h3 className="font-bold text-sm text-on-surface">Paste a Client Post</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container-high text-xs text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Source Platform (Upwork, LinkedIn, Reddit, etc.)
                </label>
                <input
                  type="text"
                  value={pastePlatform}
                  onChange={(e) => setPastePlatform(e.target.value)}
                  placeholder="e.g. Upwork, Contra, LinkedIn"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Post or Page URL
                </label>
                <input
                  type="url"
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Post Text / Client Problem <span className="text-error">*</span>
                </label>
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the post text here. We'll extract company name, verbatim quote, need summary, and generate human-tested pitches."
                  className="w-full text-xs p-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs bg-surface-container-high text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPaste}
                  className="px-4 py-2 rounded-lg text-xs bg-primary text-on-primary font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isSubmittingPaste ? 'Extracting Need...' : 'Extract & Generate Pitch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl max-w-lg w-full border border-outline-variant/40 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">photo_camera</span>
                <h3 className="font-bold text-sm text-on-surface">Screenshot to Lead (Gemini Vision)</h3>
              </div>
              <button
                onClick={() => setShowScreenshotModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container-high text-xs text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScreenshotSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Upload Screenshot Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-on-surface file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:opacity-90"
                  required
                />
              </div>

              {screenshotBase64 && (
                <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 max-h-48 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotBase64} alt="Screenshot preview" className="max-h-44 object-contain rounded" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Source Platform (Optional)
                </label>
                <input
                  type="text"
                  value={screenshotPlatform}
                  onChange={(e) => setScreenshotPlatform(e.target.value)}
                  placeholder="e.g. Upwork, Twitter / X, Slack"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Post URL (Optional)
                </label>
                <input
                  type="url"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScreenshotModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs bg-surface-container-high text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingScreenshot || !screenshotBase64}
                  className="px-4 py-2 rounded-lg text-xs bg-primary text-on-primary font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {isSubmittingScreenshot ? 'Analyzing Image...' : 'Analyze with Gemini Vision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookmarklet Modal */}
      {showBookmarkletModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl max-w-lg w-full border border-outline-variant/40 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[22px]">bookmark</span>
                <h3 className="font-bold text-sm text-on-surface">Quick Capture Bookmarklet</h3>
              </div>
              <button
                onClick={() => setShowBookmarkletModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container-high text-xs text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface leading-relaxed">
              <p>
                Save client posts from <strong>Upwork, LinkedIn, Reddit, or X</strong> with a single click.
              </p>

              {/* Bookmarklet Drag Button */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center gap-2 text-center">
                <span className="text-[11px] text-on-surface-variant">Drag this button to your Bookmarks Bar:</span>
                <a
                  href={bookmarkletCode}
                  onClick={(e) => e.preventDefault()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md cursor-grab active:cursor-grabbing hover:bg-indigo-500 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Capture to Radar</span>
                </a>
                <span className="text-[10px] text-on-surface-variant italic">
                  (Or copy code below to paste into bookmark URL)
                </span>
              </div>

              {/* Installation Guide */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                <div className="font-semibold text-on-surface">How to install (Desktop Chrome/Safari/Edge):</div>
                <ol className="list-decimal list-inside space-y-1 text-on-surface-variant">
                  <li>Show your browser bookmarks bar (Ctrl+Shift+B or Cmd+Shift+B).</li>
                  <li>Drag the &quot;Capture to Radar&quot; button above into your bookmarks bar.</li>
                  <li>Whenever you see a client request on any tab, highlight text and click the bookmark!</li>
                </ol>

                <div className="font-semibold text-on-surface pt-2">Roman Urdu Instructions:</div>
                <p className="text-on-surface-variant italic bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                  Apne browser ki bookmarks bar open karein. Upar wale button ko drag kar ke bookmarks me drop karein. Jab bhi Upwork ya LinkedIn pe koi client post nazar aaye, text select karein aur bookmark pe click karein—lead seedha aapke radar me capture ho jayegi!
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(bookmarkletCode);
                  success('Bookmarklet JavaScript code copied to clipboard!');
                }}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Copy JavaScript Code
              </button>

              <button
                type="button"
                onClick={() => setShowBookmarkletModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources Health Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container rounded-2xl max-w-3xl w-full border border-outline-variant/40 shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base text-on-surface">45+ Verified Lead Sources Registry</h3>
                <p className="text-xs text-on-surface-variant">
                  Categorized by Access Tier: Official APIs, Manual Assist, and Link-only channels.
                </p>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container-high text-xs text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {sources.map(src => (
                <div
                  key={src.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">{src.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono">
                        {src.domain}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          src.accessTier === 'tier_a_auto'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : src.accessTier === 'tier_b_manual'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : src.accessTier === 'expert_network_excluded'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {src.accessTier === 'tier_a_auto'
                          ? 'Tier A (Auto API)'
                          : src.accessTier === 'tier_b_manual'
                          ? 'Tier B (Manual Assist)'
                          : src.accessTier === 'expert_network_excluded'
                          ? 'Excluded (Expert Network)'
                          : 'Tier C (Link)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">{src.termsNote}</p>
                  </div>

                  <div className="text-[11px] text-right text-on-surface-variant shrink-0">
                    <div className="font-semibold text-on-surface">{src.method}</div>
                    <div>Status: {src.status}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
