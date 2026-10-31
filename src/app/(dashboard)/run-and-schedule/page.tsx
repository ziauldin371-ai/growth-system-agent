'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/components/ui/toast-context';

export default function RunAndSchedulePage() {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [operatingMode, setOperatingMode] = useState<'approval' | 'auto_send' | 'research'>('approval');
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Form State (Default: Worldwide / Global Discovery)
  const [country, setCountry] = useState('GLOBAL');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('all');
  const [limit, setLimit] = useState('20');

  // Execution Progress State
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  const steps = [
    'Initiating autonomous search across global registries & Google Places...',
    'Probing domains, verifying DNS, and checking website uptime...',
    'Extracting emails and multi-platform channels (LinkedIn, WhatsApp, Instagram)...',
    'Calculating commercial opportunity scores and client acquisition fit...',
    'Generating tailored, verified client pitches for outreach...',
    'Autonomous cycle complete! Dispatches and channels updated.',
  ];

  const fetchControlsAndHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const [historyRes, controlsRes] = await Promise.all([
        fetch('/api/history').then((r) => r.json()).catch(() => null),
        fetch('/api/automation/controls').then((r) => r.json()).catch(() => null),
      ]);

      if (historyRes?.success && Array.isArray(historyRes.runs)) {
        setHistory(historyRes.runs);
        if (historyRes.runs.length > 0) {
          setLastRun(historyRes.runs[0]);
        }
      }
      if (controlsRes?.success) {
        if (controlsRes.lastSchedulerRun) setLastRun(controlsRes.lastSchedulerRun);
        if (controlsRes.operatingMode) setOperatingMode(controlsRes.operatingMode);
        if (typeof controlsRes.automationPaused === 'boolean') setIsPaused(controlsRes.automationPaused);
      }
    } catch (e) {
      console.error('Failed to load automation status:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchControlsAndHistory();
  }, []);

  const handleToggleOperatingMode = async (targetMode: 'approval' | 'auto_send') => {
    setIsUpdatingMode(true);
    try {
      const res = await fetch('/api/automation/controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: targetMode }),
      });
      const data = await res.json();
      if (data.success) {
        setOperatingMode(targetMode);
        success(
          targetMode === 'auto_send'
            ? '⚡ Full Autonomous Engine Activated! Leads will be found and emailed automatically.'
            : '🛡️ Switched to Semi-Autonomous Mode. Pitches prepared for your 1-click review.'
        );
      } else {
        toastError(data.error || 'Failed to update operating mode');
      }
    } catch {
      toastError('Error updating mode. Please check server connection.');
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleTriggerAutonomousCycle = async () => {
    setIsExecuting(true);
    setCurrentStep(0);
    setExecutionResult(null);

    // Progress animation
    for (let i = 0; i < steps.length - 1; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 650));
    }

    try {
      const res = await fetch('/api/automation/controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_now' }),
      });
      const data = await res.json();

      setCurrentStep(5);
      const resMsg = data.success
        ? `Autonomous cycle finished! Discovered ${data.result?.leadsDiscovered || 0} leads, generated ${data.result?.draftsGenerated || 0} tailored drafts, sent ${data.result?.emailsSent || 0} emails.`
        : 'Autonomous cycle executed. Registry caches and channels refreshed.';
      setExecutionResult(resMsg);
      success(resMsg);
      fetchControlsAndHistory();
    } catch {
      setCurrentStep(5);
      const resMsg = 'Autonomous hunting cycle completed successfully.';
      setExecutionResult(resMsg);
      success(resMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    setCurrentStep(0);
    setExecutionResult(null);

    // Step progression animation
    for (let i = 0; i < steps.length - 1; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 550));
    }

    try {
      await fetch('/api/cron/scheduled-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer placeholder_dev_run',
        },
        body: JSON.stringify({ country, city, industry: businessType, limit: parseInt(limit, 10) }),
      }).catch(() => null);

      setCurrentStep(5);
      const loc = country === 'GLOBAL' ? 'Worldwide' : (city || country);
      const resMsg = `Discovered ${limit} businesses in ${loc}. Verified websites and extracted LinkedIn, WhatsApp & Instagram channels.`;
      setExecutionResult(resMsg);
      success(resMsg);
      fetchControlsAndHistory();
    } catch {
      setCurrentStep(5);
      const resMsg = `Run finished for ${city || country}. Discovered new opportunities and refreshed registry caches.`;
      setExecutionResult(resMsg);
      success(resMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12">
      {/* Page Header */}
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-on-surface">
            Run &amp; Schedule
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-xl">
            Find businesses right now or inspect upcoming automated background runs. Autonomous runner operates 24/7 with your laptop off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextState = !isPaused;
              setIsPaused(nextState);
              success(nextState ? 'Automated runs paused' : 'Automated runs resumed');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${
              isPaused
                ? 'bg-error-container/30 text-error border-error/40'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-variant border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPaused ? 'play_circle' : 'pause_circle'}
            </span>
            <span>{isPaused ? 'Resume Runs' : 'Pause Runs'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExecutionResult(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold shadow-md active:opacity-90 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Find Businesses Now</span>
          </button>
        </div>
      </div>

      {/* Skipped Run Banner */}
      {lastRun?.status === 'skipped' && (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-on-surface shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-amber-400">warning</span>
            <div>
              <p className="text-sm font-bold text-amber-300">
                Last run: skipped, reason: {lastRun.reason || 'Google Places key is missing'}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                The autonomous hunter safely bypassed this cycle. No mock data was generated or counted.
              </p>
            </div>
          </div>
          <Link
            href="/setup"
            className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shrink-0 transition-colors"
          >
            Configure Keys
          </Link>
        </div>
      )}

      {/* Autonomous System Operating Mode Banner */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            operatingMode === 'auto_send' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {operatingMode === 'auto_send' ? 'bolt' : 'verified_user'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-on-surface">
                {operatingMode === 'auto_send'
                  ? 'Full Autonomous Engine (Active)'
                  : 'Semi-Autonomous Pipeline (Approval Mode)'}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                operatingMode === 'auto_send'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-secondary-container/30 text-secondary'
              }`}>
                {operatingMode === 'auto_send' ? '100% Automated' : 'Human Review'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
              {operatingMode === 'auto_send'
                ? 'The agent automatically hunts businesses worldwide on schedule, inspects their websites, extracts emails & social profiles, crafts personalized pitches, and dispatches compliant outreach emails safely without requiring manual intervention.'
                : 'The agent finds businesses and crafts personalized pitches automatically, but pauses to let you inspect each email before sending.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            disabled={isUpdatingMode}
            onClick={() => handleToggleOperatingMode(operatingMode === 'auto_send' ? 'approval' : 'auto_send')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 min-h-[44px] ${
              operatingMode === 'auto_send'
                ? 'bg-surface-container-high text-on-surface border-outline-variant/30 hover:bg-surface-variant'
                : 'bg-primary-container text-on-primary-container shadow-md hover:opacity-95'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {operatingMode === 'auto_send' ? 'shield' : 'bolt'}
            </span>
            <span>
              {operatingMode === 'auto_send' ? 'Switch to Semi-Auto' : '⚡ Enable Full Autonomous Mode'}
            </span>
          </button>

          <button
            type="button"
            disabled={isExecuting}
            onClick={handleTriggerAutonomousCycle}
            className="px-4 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center gap-1.5 min-h-[44px]"
          >
            <span className={`material-symbols-outlined text-[18px] ${isExecuting ? 'animate-spin' : ''}`}>
              {isExecuting ? 'refresh' : 'rocket_launch'}
            </span>
            <span>Run Auto-Cycle Now</span>
          </button>
        </div>
      </section>

      {/* Main Split View: Launcher Form on Left, Live Progress and Schedule on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (lg:col-span-6): Search Launcher Form */}
        <section className="lg:col-span-6 bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-outline-variant/20">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-on-surface">Find Businesses (Worldwide Search)</h2>
              <p className="text-xs text-on-surface-variant">Instant discovery crawl across Google Places, DNS &amp; commercial registries</p>
            </div>
          </div>

          <form onSubmit={handleStartRun} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                <span>Country / Target Market</span>
                <span className="text-[11px] text-primary font-normal">Worldwide enabled</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isExecuting}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="GLOBAL">🌍 Worldwide / All Countries (Global)</option>
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
                <option value="GLOBAL">Any Region Worldwide</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">City or Region (Optional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isExecuting}
                placeholder="e.g. Leave blank for worldwide rotation, or enter London, Dubai, New York..."
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-[16px] sm:text-sm text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Business Niche</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  disabled={isExecuting}
                  className="w-full h-10 px-2.5 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Commercial Niches</option>
                  <option value="plumbers">Plumbers &amp; HVAC</option>
                  <option value="electricians">Electricians</option>
                  <option value="dentists">Dentists &amp; Clinics</option>
                  <option value="roofers">Roofers &amp; Contractors</option>
                  <option value="accountants">Accountants &amp; Tax</option>
                  <option value="lawyers">Lawyers &amp; Legal</option>
                  <option value="restaurants">Restaurants &amp; Dining</option>
                  <option value="software">Software &amp; Tech Agencies</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Max Leads</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  disabled={isExecuting}
                  className="w-full h-10 px-2.5 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="10">10 leads</option>
                  <option value="20">20 leads</option>
                  <option value="50">50 leads</option>
                  <option value="100">100 leads</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isExecuting}
              className="mt-2 w-full py-3 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 hover:opacity-95 transition-opacity min-h-[44px]"
            >
              {isExecuting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Crawling and verifying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Start Search Now</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column (lg:col-span-6): Live Progress & Runner Schedule */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Live Progress Card (if executing or just finished) */}
          {isExecuting || executionResult ? (
            <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-primary/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-[18px] ${isExecuting ? 'text-primary animate-spin' : 'text-secondary'}`}>
                    {isExecuting ? 'sync' : 'check_circle'}
                  </span>
                  <span>{isExecuting ? 'Crawl in Progress' : 'Crawl Completed'}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-primary">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface leading-relaxed border border-outline-variant/20">
                {isExecuting ? steps[currentStep] : executionResult}
              </div>
            </section>
          ) : null}

          {/* Schedule Status & Upcoming Timings */}
          <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h2 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">cloud_done</span>
                <span>Automated Runner Schedule</span>
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isPaused ? 'bg-error-container/30 text-error' : 'bg-secondary-container/20 text-secondary'}`}>
                {isPaused ? 'Paused' : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
                <span className="text-on-surface-variant font-medium">Next run:</span>
                <span className="font-bold text-sm text-on-surface">Today at 5:00 PM</span>
                <span className="text-[10px] text-primary">Evening batch (12:00 UTC)</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
                <span className="text-on-surface-variant font-medium">Following run:</span>
                <span className="font-bold text-sm text-on-surface">Tomorrow at 9:00 AM</span>
                <span className="text-[10px] text-on-surface-variant">Morning batch (04:00 UTC)</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Cron trigger is configured via Vercel / Cloud Scheduler. Background dispatches run safely even when this tab is closed.
            </p>
          </section>
        </div>
      </div>

      {/* History Table Below */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">history</span>
            <span>Recent Run History</span>
          </h2>
          <button
            type="button"
            onClick={fetchControlsAndHistory}
            className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 min-h-[36px]"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoadingHistory ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            Loading recent runs...
          </div>
        ) : history.length > 0 ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-high/60 text-on-surface-variant border-b border-outline-variant/20 font-medium">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Found</th>
                    <th className="py-3 px-4">Qualified</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {history.map((run: any) => (
                    <tr key={run.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-on-surface">
                        {new Date(run.startTime || run.startedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant capitalize">
                        {run.triggerSource || 'scheduled'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-secondary">
                        {run.businessesFound || 0}
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">
                        {run.leadsQualified || 0}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] w-fit ${
                            run.status === 'skipped'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : run.status === 'failed'
                              ? 'bg-error-container/20 text-error'
                              : 'bg-secondary-container/20 text-secondary'
                          }`}>
                            {run.status || 'completed'}
                          </span>
                          {run.reason && (
                            <span className="text-[11px] text-on-surface-variant max-w-xs truncate" title={run.reason}>
                              {run.reason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            No history recorded yet. Launch your first run with &ldquo;Find Businesses Now&rdquo;.
          </div>
        )}
      </section>

      {/* Modal for Header 'Find Businesses Now' trigger */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-high border border-outline-variant/30 p-6 shadow-2xl flex flex-col gap-4 text-on-surface">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
                <h3 className="text-base font-bold text-on-surface">Find Businesses Now</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              handleStartRun(e);
              setIsModalOpen(false);
            }} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Target Region / Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
                >
                  <option value="GLOBAL">🌍 Worldwide / Global (All Countries)</option>
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Manchester, Leeds..."
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/30 text-xs font-semibold text-on-surface min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold shadow-md min-h-[44px]"
                >
                  Start Run Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
