import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { 
  Globe, 
  Cpu, 
  CheckCircle2, 
  Send, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  const stats = dataStore.getPlatformStats();
  const { businesses: recentLeads } = dataStore.getBusinesses({ limit: 6 });
  const pendingApprovals = dataStore.getDrafts({ status: 'draft' });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            GrowthSignal AI Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous multi-market B2B intelligence calibrated for Senior Full-Stack AI & Automation Engineering.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/approval-queue"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{pendingApprovals.length} Drafts Awaiting Admin Approval</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Commercial Leads</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{stats.totalBusinesses}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{stats.qualifiedTotal} qualified</span> across US, UK, CA, AU
          </div>
        </div>

        {/* Pipeline A (Web Gaps) */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pipeline A: Website Gaps</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{stats.pipelineAOpportunities}</div>
          <div className="text-xs text-slate-400 mt-1">
            Active businesses without verified functional websites
          </div>
        </div>

        {/* Pipeline B (AI & Software) */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pipeline B: AI & Software</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{stats.pipelineBOpportunities}</div>
          <div className="text-xs text-slate-400 mt-1">
            Startups & agencies showing LLM, RAG, or Python signals
          </div>
        </div>

        {/* Safety & Compliance */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Approved Dispatched</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{stats.sentCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{stats.suppressionCount} entries</span> on suppression list
          </div>
        </div>
      </div>

      {/* Two Pipeline Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline A Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-cyan-900/40 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Pipeline A — Website Opportunities</h3>
                <p className="text-xs text-slate-400">High-intent local trade & commerce lacking digital infrastructure</p>
              </div>
            </div>
            <Link
              href="/pipeline-a"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>Explore</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Identifies profitable, operating businesses verified through official registries and customer reviews that have no functioning website, an expired domain, or operate exclusively via third-party social media profiles.
          </p>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Services:</span>
            <span className="text-slate-200 font-medium">Turnkey Web Dev • Online Booking • Local SEO</span>
          </div>
        </div>

        {/* Pipeline B Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-purple-900/40 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Pipeline B — AI & Software Opportunities</h3>
                <p className="text-xs text-slate-400">Companies exhibiting documented signals for AI, Python & RAG</p>
              </div>
            </div>
            <Link
              href="/pipeline-b"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
            >
              <span>Explore</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Discovers startups, SaaS companies, and digital agencies displaying credible public hiring signals, tech stack expansion, funding updates, or manual workflow bottlenecks suitable for custom LLM integrations.
          </p>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Services:</span>
            <span className="text-slate-200 font-medium">LLMs & RAG • Python Automation • White-Label Engineering</span>
          </div>
        </div>
      </div>

      {/* Recent Qualified Leads Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Qualified Prospects</h3>
            <p className="text-xs text-slate-400 mt-0.5">Scored with verifiable facts and full evidence provenance</p>
          </div>
          <Link
            href="/discovery"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            View All Discoveries →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6">Company</th>
                <th className="py-3 px-6">Assigned Pipeline</th>
                <th className="py-3 px-6">Website Status</th>
                <th className="py-3 px-6">Location</th>
                <th className="py-3 px-6 text-center">Score</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentLeads.map((biz) => {
                const isPipeA = biz.pipelineType === 'website_opportunities';
                const score = biz.score?.overallScore ?? 0;

                return (
                  <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-medium text-white">
                      <div className="font-semibold text-slate-100">{biz.name}</div>
                      <div className="text-[11px] text-slate-400">{biz.industry}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isPipeA
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        }`}
                      >
                        {isPipeA ? 'Pipeline A: Web Dev' : 'Pipeline B: AI & Software'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-[11px] text-slate-300">
                        {biz.websiteCheck?.status || 'apparently_absent'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {biz.city ? `${biz.city}, ${biz.country}` : biz.country}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded font-bold text-xs ${
                          score >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {score}/100
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/businesses/${biz.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-block"
                      >
                        View Dossier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
