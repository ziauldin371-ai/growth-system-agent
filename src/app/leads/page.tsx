'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Cpu,
  Search, 
  Filter, 
  ExternalLink, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Share2
} from 'lucide-react';

export default function WorldwideLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('all'); // 'all' | 'has_email' | 'no_email'
  const [minScore, setMinScore] = useState(0);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (countryFilter !== 'all') params.set('country', countryFilter);
      if (pipelineFilter !== 'all') params.set('pipeline', pipelineFilter);
      if (search) params.set('search', search);
      if (minScore > 0) params.set('minScore', minScore.toString());
      if (emailFilter === 'has_email') params.set('hasEmail', 'true');
      if (emailFilter === 'no_email') params.set('hasEmail', 'false');

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [countryFilter, pipelineFilter, emailFilter, minScore, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-400" />
            <span>Worldwide Leads Discovery</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global multi-market directory across the US, UK, Canada, Australia, Europe, and International regions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ready-for-email"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>Ready for Email Queue</span>
          </Link>
          <Link
            href="/other-channels"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>Alternative Channels</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, city, or domain..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Target Region / Market</label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
            >
              <option value="all">All Countries</option>
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="CA">Canada (CA)</option>
              <option value="AU">Australia (AU)</option>
              <option value="DE">Germany (DE / EU)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Service Pipeline</label>
            <select
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
            >
              <option value="all">All Pipelines</option>
              <option value="website_opportunities">Pipeline A: Web Opportunities</option>
              <option value="ai_software_opportunities">Pipeline B: AI & Software</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Email Availability</label>
            <select
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
            >
              <option value="all">All Businesses</option>
              <option value="has_email">Has Usable Email</option>
              <option value="no_email">No Email (Channels Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Min Score: {minScore}/100</label>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>Discovered Businesses</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-indigo-400 font-mono">
              {leads.length} found
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading worldwide leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No businesses match your active filter criteria. Try broadening your location or score filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Business & Location</th>
                  <th className="py-3 px-4">Pipeline</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Website Status</th>
                  <th className="py-3 px-4">Email Contact</th>
                  <th className="py-3 px-4">Alternative Channels</th>
                  <th className="py-3 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {leads.map((lead) => {
                  const hasEmail = lead.contacts?.some((c: any) => c.email && c.email.includes('@'));
                  const primaryEmail = lead.contacts?.find((c: any) => c.email)?.email;
                  const channelCount = lead.alternativeChannels?.length || 0;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] text-slate-300">
                            {lead.country}
                          </span>
                          <span>{lead.city ? `${lead.city}, ${lead.region || ''}` : lead.country}</span>
                          <span className="text-slate-600">•</span>
                          <span className="truncate max-w-[150px]">{lead.industry}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {lead.pipelineType === 'website_opportunities' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <Globe className="w-3 h-3" />
                            Pipeline A (Web)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                            <Cpu className="w-3 h-3" />
                            Pipeline B (AI/Tech)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          (lead.score?.overallScore || 0) >= 80 
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {lead.score?.overallScore || 'N/A'}/100
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          lead.websiteCheck?.status === 'functional'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : lead.websiteCheck?.status === 'apparently_absent'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {lead.websiteCheck?.status || 'unverified'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {hasEmail ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono text-[11px] truncate max-w-[140px]">{primaryEmail}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-[11px]">No usable email</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {channelCount > 0 ? (
                          <Link 
                            href="/other-channels"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition-colors"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>{channelCount} Channel{channelCount > 1 ? 's' : ''}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-600 text-[11px]">None recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/businesses/${lead.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                        >
                          <span>Dossier</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

