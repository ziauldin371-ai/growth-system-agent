'use client';

import { useState } from 'react';
import { 
  Search, 
  Globe, 
  Cpu, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

export default function DiscoveryHubPage() {
  const [market, setMarket] = useState<'US' | 'UK' | 'CA' | 'AU' | 'EU' | 'GLOBAL'>('US');
  const [targetPipeline, setTargetPipeline] = useState<'website_opportunities' | 'ai_software_opportunities' | 'both'>('both');
  const [industry, setIndustry] = useState('HVAC & Home Services');
  const [location, setLocation] = useState('Austin, TX');
  const [provider, setProvider] = useState('auto');
  const [limit, setLimit] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market,
          targetPipeline,
          industry,
          location,
          provider,
          limit: Number(limit),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResultMessage(`Discovery crawl job enqueued successfully (Job ID: ${data.jobId}). The background worker will verify websites, score evidence, and qualify leads into their respective pipelines.`);
      } else {
        setResultMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setResultMessage(`Failed to trigger discovery: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Lead Discovery Hub</h1>
        <p className="text-sm text-slate-400 mt-1">
          Multi-market commercial discovery across official registries, licensed datasets, and authorized public channels.
        </p>
      </div>

      {/* Discovery Form Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-sm">
        <form onSubmit={handleRunDiscovery} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Target Market */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Market / Jurisdiction
              </label>
              <select
                value={market}
                onChange={(e: any) => setMarket(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="US">United States (US)</option>
                <option value="UK">United Kingdom (UK)</option>
                <option value="CA">Canada (CA)</option>
                <option value="AU">Australia (AU)</option>
                <option value="EU">European Union (EU)</option>
                <option value="GLOBAL">Global Multi-Market</option>
              </select>
            </div>

            {/* Target Pipeline */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Pipeline Focus
              </label>
              <select
                value={targetPipeline}
                onChange={(e: any) => setTargetPipeline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="both">Both Pipelines (Balanced)</option>
                <option value="website_opportunities">Needs a website: Website Opportunities Only</option>
                <option value="ai_software_opportunities">Needs AI / software: AI & Software Opportunities Only</option>
              </select>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Discovery Provider Adapter
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto-Select (Recommended)</option>
                <option value="b2b_mock">Licensed B2B Sandbox (Offline/Testing)</option>
                <option value="google_places">Google Places API (New)</option>
                <option value="companies_house">UK Companies House Public Register</option>
              </select>
            </div>

            {/* Industry / Sector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Industry / Sector
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Supply Chain SaaS, Legal, HVAC"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                City / Region Filter
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Austin TX, London, Toronto"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Max Prospects to Process
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {resultMessage && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>{resultMessage}</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              * The crawler automatically verifies domains against SSRF, checks DNS, and scores leads against 7 ICP models.
            </span>
            <button
              type="submit"
              disabled={isRunning}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enqueuing Crawl...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Discovery Crawl</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Discovery Pipeline Architecture Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            1. Autonomous Probing
          </div>
          <p className="text-[11px] text-slate-400">
            Every candidate domain is checked through SSRF-safe DNS resolution and HTTP/TLS probing to detect parked domains or absent websites.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            2. Evidence Harvesting
          </div>
          <p className="text-[11px] text-slate-400">
            Records factual corporate registrations, hiring openings, and customer reviews with observation timestamps and source URLs.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            3. Strict Qualification
          </div>
          <p className="text-[11px] text-slate-400">
            Only prospects with verified commercial activity receive qualification scores. Inaccessible data is treated as unknown.
          </p>
        </div>
      </div>
    </div>
  );
}
