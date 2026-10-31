'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MarketplaceHotRequestEntity, PlatformEntity } from '@/types';
import { useLanguage } from '@/context/language-context';

export function ClientRequestsView() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<MarketplaceHotRequestEntity[]>([]);
  const [platforms, setPlatforms] = useState<PlatformEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Add Form state
  const [platformId, setPlatformId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [budget, setBudget] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqsRes, platsRes] = await Promise.all([
        fetch('/api/platforms/hot-requests'),
        fetch('/api/platforms?pitch_mode=proposal'),
      ]);
      const reqsData = await reqsRes.json();
      const platsData = await platsRes.json();
      setRequests(reqsData.requests || []);
      setPlatforms(platsData.platforms || []);
      if (platsData.platforms?.length > 0) {
        setPlatformId(platsData.platforms[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyProposal = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Proposal copied to clipboard! Ready to paste into marketplace.');
  };

  const handleStatusUpdate = async (id: string, newStatus: MarketplaceHotRequestEntity['status']) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    try {
      await fetch('/api/platforms/hot-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast('Error updating status');
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !rawText) return;
    setIsDrafting(true);
    try {
      const res = await fetch('/api/platforms/hot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: platformId || (platforms[0]?.id ?? 'upwork'),
          job_title: jobTitle,
          job_url: jobUrl || 'https://upwork.com',
          job_description: rawText,
          client_budget: budget || undefined,
        }),
      });
      const data = await res.json();
      if (data.request) {
        setRequests((prev) => [data.request, ...prev]);
        showToast('Request classified and proposal drafted!');
        setIsQuickAddOpen(false);
        setJobTitle('');
        setJobUrl('');
        setRawText('');
        setBudget('');
      } else {
        showToast('Failed to create request');
      }
    } catch {
      showToast('Error submitting request');
    } finally {
      setIsDrafting(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        search === '' ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.platform.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = filterPlatform === 'all' || r.platform === filterPlatform;
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [requests, search, filterPlatform, filterStatus]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-surface-container-high to-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">local_fire_department</span>
            <h2 className="text-lg font-bold text-on-surface">Hot Marketplace Requests (Group A)</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
            Where clients actively post work (Upwork, Freelancer, Contra, PeoplePerHour, Kolabtree, etc.). The client already has an active budget
            and urgent need. Review AI classification, spam/scam checks, and click once to copy a tailored proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Paste New Request</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posted requests or tech..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-xs bg-surface-container-high text-on-surface border border-outline-variant/30 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Platforms</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-surface-container-high text-on-surface border border-outline-variant/30 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="proposal_ready">Proposal Ready</option>
            <option value="submitted">Submitted</option>
            <option value="interviewing">Interviewing</option>
            <option value="hired">Hired</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant">Loading client requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs text-on-surface-variant">
          No marketplace client requests found. Use &quot;Paste New Request&quot; to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 hover:border-outline-variant transition-all shadow-sm flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-bold">
                    {req.platform}
                  </span>
                  <h3 className="font-bold text-sm text-on-surface">{req.title}</h3>
                  {req.isScam && (
                    <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      <span>Suspicious Request</span>
                    </span>
                  )}
                  {req.fitScore >= 80 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      High Fit ({req.fitScore}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant font-mono">
                    {req.budgetRange ? req.budgetRange : 'Hourly / Flexible'}
                  </span>
                  <select
                    value={req.status}
                    onChange={(e) =>
                      handleStatusUpdate(req.id, e.target.value as MarketplaceHotRequestEntity['status'])
                    }
                    className="text-xs bg-surface-container-high text-on-surface border border-outline-variant/30 rounded px-2 py-1"
                  >
                    <option value="new">New</option>
                    <option value="proposal_copied">Proposal Copied</option>
                    <option value="submitted">Submitted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              {/* Body: Job Description snippet */}
              <div className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                {req.description}
              </div>

              {/* Proposal Draft Area */}
              {req.proposalDraft && (
                <div className="bg-surface-container-high/40 p-3.5 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>Ready Proposal Draft (Evidence-Only)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyProposal(req.proposalDraft || '')}
                      className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold flex items-center gap-1 hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      <span>Copy Proposal</span>
                    </button>
                  </div>
                  <pre className="text-xs text-on-surface whitespace-pre-wrap font-sans leading-relaxed bg-surface-container-lowest/60 p-2.5 rounded border border-outline-variant/10">
                    {req.proposalDraft}
                  </pre>
                </div>
              )}

              {/* Footer info */}
              <div className="flex items-center justify-between text-[11px] text-outline pt-1">
                <span>
                  Post Type: <strong className="text-on-surface-variant">{req.postType || 'Client Project'}</strong>
                </span>
                <a
                  href={req.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>Open on {req.platform}</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl border border-outline-variant/30 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-on-surface">Paste Client Request</h3>
                <p className="text-xs text-on-surface-variant">
                  Paste the job title and description from Upwork, Freelancer, or Contra to classify it and draft a winning proposal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Platform</label>
                  <select
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Budget / Rate (optional)</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. $1,500 fixed or $60/hr"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Need Senior Engineer to build LLM RAG agent with Supabase and LangChain"
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Job Post URL (optional)</label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://www.upwork.com/jobs/..."
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Job Description / RFP Text</label>
                <textarea
                  rows={5}
                  required
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full job post details here..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs border border-outline-variant/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDrafting}
                  className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isDrafting ? 'Classifying & Drafting...' : 'Draft Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
