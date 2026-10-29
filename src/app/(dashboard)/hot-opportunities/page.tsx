'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  MapPin, 
  MessageSquare, 
  Mail, 
  Briefcase, 
  Search,
  AlertTriangle
} from 'lucide-react';
import { IntentOpportunityEntity } from '@/types';

export default function HotOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<IntentOpportunityEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    sourceUrl: '',
    rawText: '',
    platform: 'linkedin_manual',
    authorOrPoster: '',
    statedTitle: '',
  });

  const loadOpportunities = async () => {
    try {
      const res = await fetch('/api/intent');
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error('Failed to load intent opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleScanFeeds = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/intent/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error('Failed to scan feeds:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyPitch = (id: string, pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/intent/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadOpportunities();
    } catch (err) {
      console.error('Failed to update opportunity status:', err);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.rawText || !quickAddForm.sourceUrl) return;

    try {
      const res = await fetch('/api/intent/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickAddForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowQuickAdd(false);
        setQuickAddForm({ sourceUrl: '', rawText: '', platform: 'linkedin_manual', authorOrPoster: '', statedTitle: '' });
        loadOpportunities();
      }
    } catch (err) {
      console.error('Quick add failed:', err);
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'hacker_news':
        return <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold">Hacker News</span>;
      case 'reddit':
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">Reddit</span>;
      case 'remotive':
      case 'remote_ok':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">Job Feed</span>;
      case 'upwork_manual':
        return <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold">Upwork</span>;
      case 'linkedin_manual':
        return <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">LinkedIn</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">Direct Lead</span>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.round(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500 animate-pulse" />
            <span>Hot Intent Radar: People Looking for My Skills Right Now</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time hiring requests, freelance queries, and technical contract posts across Hacker News, Reddit, and remote boards. Ranked by skill fit and freshness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanFeeds}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            <span>{isScanning ? 'Scanning Live Feeds...' : 'Scan Intent Feeds'}</span>
          </button>

          <button
            onClick={() => setShowQuickAdd(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add Lead</span>
          </button>
        </div>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading warm intent radar...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No warm opportunities currently found. Click &quot;Scan Intent Feeds&quot; to poll live sources.
        </div>
      ) : (
        <div className="space-y-5">
          {opportunities.map((opp) => {
            const isHotAlert = opp.fitScore >= 80;
            const isCopied = copiedId === opp.id;

            return (
              <div
                key={opp.id}
                className={`p-6 rounded-xl bg-slate-900/90 border backdrop-blur-md space-y-4 shadow-xl transition-all ${
                  isHotAlert ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-800'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getPlatformBadge(opp.sourcePlatform)}
                    {isHotAlert && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Hot Priority Lead</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{getTimeAgo(opp.postedAt)}</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      by {opp.posterIdentity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-400">
                      Fit: {opp.fitScore}/100
                    </div>
                    {opp.isLegitimate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Post</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Flagged Post</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Post details */}
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-100 hover:text-amber-400 transition-colors">
                    <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                      <span>{opp.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                    {opp.sanitizedSummary}
                  </p>
                </div>

                {/* Metadata tags */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {opp.neededSkills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900/50 text-[11px]">
                      {skill}
                    </span>
                  ))}
                  {opp.statedBudget && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-900/50 text-[11px] flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{opp.statedBudget}</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] capitalize">
                    Route: {opp.replyRoute.replace('_', ' ')}
                  </span>
                </div>

                {/* Pitch box */}
                {opp.tailoredPitch && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Ready Pitch / Custom Proposal ({opp.pitchWordCount || 0} words)</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Anti-Spam & Evidence Bound
                      </span>
                    </div>
                    <pre className="font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {opp.tailoredPitch}
                    </pre>
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {opp.tailoredPitch && (
                      <button
                        onClick={() => handleCopyPitch(opp.id, opp.tailoredPitch!)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                          isCopied ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied Proposal!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Pitch</span>
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={opp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <span>Open Thread / Job Post</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    <button
                      onClick={() => handleStatusChange(opp.id, 'pitched')}
                      className="px-3 py-1.5 rounded-md bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-medium"
                    >
                      Mark as Contacted
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(opp.id, 'dismissed')}
                      className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Quick Add Warm Lead (Paste URL / Post)</span>
              </h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Source Platform</label>
                <select
                  value={quickAddForm.platform}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, platform: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value="linkedin_manual">LinkedIn Post / Group</option>
                  <option value="upwork_manual">Upwork Project</option>
                  <option value="reddit">Reddit Thread</option>
                  <option value="x_twitter">X / Twitter Post</option>
                  <option value="other_manual">Discord / Slack / Telegram</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Post or Job URL *</label>
                <input
                  type="url"
                  required
                  value={quickAddForm.sourceUrl}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, sourceUrl: e.target.value })}
                  placeholder="https://linkedin.com/posts/... or https://upwork.com/jobs/..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Poster Name or Handle</label>
                <input
                  type="text"
                  value={quickAddForm.authorOrPoster}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, authorOrPoster: e.target.value })}
                  placeholder="e.g. Alex Henderson (Founder)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Pasted Post Content *</label>
                <textarea
                  required
                  rows={4}
                  value={quickAddForm.rawText}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, rawText: e.target.value })}
                  placeholder="Paste the post text here. The classifier will extract skills, budget, and draft a custom proposal..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  Analyze & Generate Pitch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
