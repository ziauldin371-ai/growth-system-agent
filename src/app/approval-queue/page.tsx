'use client';

import { useState, useEffect } from 'react';
import { 
  MailCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  Sparkles, 
  ExternalLink,
  ShieldAlert,
  Send,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function ApprovalQueuePage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDrafts = () => {
    setLoading(true);
    fetch('/api/outreach')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDrafts(data.drafts);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleApproveOrReject = async (draftId: string, action: 'approve' | 'reject') => {
    setProcessingId(draftId);
    setActionMessage(null);

    try {
      const res = await fetch('/api/outreach/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, action }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(`Draft successfully ${action === 'approve' ? 'approved for campaign dispatch' : 'rejected'}.`);
        loadDrafts();
      } else {
        setActionMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Failed to update draft: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = filterStatus === 'all' 
    ? drafts 
    : drafts.filter(d => d.status === filterStatus);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            AI Outreach & Approval Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Human-in-the-loop review station. Inspect grounded facts, review value propositions, and authorize outreach.
          </p>
        </div>
      </div>

      {/* Draft-Only Safety Guardrail Banner */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Statutory Draft-Only Safety Mode Enforced:</span> GrowthSignal AI never sends unverified automated emails. Real outreach occurs strictly after authenticated administrator approval, recipient suppression filtering, and sending window verification (CAN-SPAM & UK PECR compliant).
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-xs">
        {[
          { key: 'all', label: 'All Drafts' },
          { key: 'draft', label: 'Pending Approval' },
          { key: 'approved', label: 'Approved (Ready to Dispatch)' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'sent', label: 'Sent' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === tab.key
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drafts List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
          <span>Loading approval queue...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400">
          <MailCheck className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No drafts found in this category</h3>
          <p className="text-xs text-slate-500 mt-1">
            Navigate to Pipeline A or Pipeline B and click &quot;Generate Outreach Draft&quot; on any qualified lead.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((draft) => {
            const isPending = draft.status === 'draft';
            const isApproved = draft.status === 'approved';

            return (
              <div
                key={draft.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm space-y-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{draft.selectedSubject}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                        draft.status === 'approved'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : draft.status === 'rejected'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {draft.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span>Strategy: <strong className="text-slate-300 font-mono">{draft.strategy}</strong></span>
                      <span>•</span>
                      <span>Version: v{draft.version}</span>
                      <span>•</span>
                      <span>Confidence: {draft.confidenceRating * 100}%</span>
                    </div>
                  </div>

                  {/* Approve / Reject Controls */}
                  {isPending && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApproveOrReject(draft.id, 'reject')}
                        disabled={processingId === draft.id}
                        className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApproveOrReject(draft.id, 'approve')}
                        disabled={processingId === draft.id}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve for Campaign</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Subject Lines Options */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Subject Line Variations Evaluated:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {draft.subjectLines?.map((subj: string, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-xs font-mono border ${
                          subj === draft.selectedSubject
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-[10px] text-slate-500 block">Option {idx + 1}</span>
                        {subj}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Body Preview */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Message Body (Rendered with Grounded Rationale):
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                    {draft.emailBody}
                  </div>
                </div>

                {/* Grounding & Evidence Footnote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 font-semibold">Tailored Value Proposition:</span>
                    <p className="text-slate-300 mt-1">{draft.valueProposition}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 font-semibold">Grounded Rationale:</span>
                    <p className="text-slate-300 mt-1">{draft.rationale}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
