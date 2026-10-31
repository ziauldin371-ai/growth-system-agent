'use client';

import { useState, useEffect } from 'react';
import { Send, Plus, CheckCircle2, AlertTriangle, ShieldCheck, Play, Pause, RefreshCw } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [targetPipeline, setTargetPipeline] = useState<'website_opportunities' | 'ai_software_opportunities'>('ai_software_opportunities');
  const [strategy, setStrategy] = useState('rag_systems');
  const [dailyCap, setDailyCap] = useState(25);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);

  const loadCampaigns = () => {
    setLoading(true);
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCampaigns(data.campaigns);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetPipeline,
          strategy,
          dailyCap: Number(dailyCap),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setName('');
        loadCampaigns();
      }
    } catch (err: any) {
      alert(`Failed to create campaign: ${err.message}`);
    }
  };

  const handleDispatch = async (campaignId: string) => {
    setDispatchMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setDispatchMessage(data.message);
        loadCampaigns();
      } else {
        setDispatchMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setDispatchMessage(`Dispatch failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Dispatcher</h1>
          <p className="text-sm text-slate-400 mt-1">
            Controlled outreach sequences. Enforces sending windows (09:00 - 17:00), daily caps, and approval checks.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {dispatchMessage && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{dispatchMessage}</span>
          </div>
          <button onClick={() => setDispatchMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
          <span>Loading campaigns...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                    camp.targetPipeline === 'website_opportunities'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  }`}>
                    {camp.targetPipeline === 'website_opportunities' ? 'Needs a website: Web Dev' : 'Needs AI / software: AI & Software'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{camp.name}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">Strategy: {camp.strategy}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  camp.status === 'running' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {camp.status}
                </span>
              </div>

              {/* Campaign Controls & Telemetry */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Daily Cap</span>
                  <span className="font-bold text-slate-200">{camp.dailyCap} emails</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Sending Window</span>
                  <span className="font-bold text-slate-200">{camp.sendingWindowStart}:00 - {camp.sendingWindowEnd}:00</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Approval Gate</span>
                  <span className="font-bold text-emerald-400">Strict Required</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {camp.stats?.sentCount || 0} sent • {camp.stats?.repliedCount || 0} replied
                </span>
                <button
                  onClick={() => handleDispatch(camp.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Approved Leads</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Outreach Campaign</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Logistics RAG Expansion"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Pipeline</label>
                <select
                  value={targetPipeline}
                  onChange={(e: any) => setTargetPipeline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ai_software_opportunities">Needs AI / software: AI & Software Opportunities</option>
                  <option value="website_opportunities">Needs a website: Website Opportunities</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Outreach Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="rag_systems">RAG & LLM Integration</option>
                  <option value="ai_automation">AI & Workflow Automation</option>
                  <option value="python_engineering">Python Engineering & APIs</option>
                  <option value="data_science">Data Science & Pipelines</option>
                  <option value="agency_partner">Agency White-Label Partner</option>
                  <option value="web_development">Web Development (Needs a website)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Cap</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={dailyCap}
                  onChange={(e) => setDailyCap(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
                >
                  Create in Draft Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
