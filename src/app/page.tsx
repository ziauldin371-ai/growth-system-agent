import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { DashboardControls } from '@/components/dashboard/dashboard-controls';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zia Ul Din • Production Lead Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Growth System Agent Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Autonomous multi-market B2B discovery & outreach calibrated for <strong>Full Stack AI Developer & Automation Architect</strong> services: LLMs, Python engineering, RAG architectures, workflow automation, APIs, and data science pipelines.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/approval-queue"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{pendingApprovals.length} Drafts Awaiting Approval</span>
          </Link>
        </div>
      </div>

      {/* Interactive Controls & Policy Bar */}
      <DashboardControls />

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Leads */}
        <Link href="/leads" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Leads</span>
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{stats.totalBusinesses}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{stats.qualifiedTotal} qualified</div>
        </Link>

        {/* Ready for Email */}
        <Link href="/ready-for-email" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Ready for Email</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{stats.eligibleEmailContacts}</div>
          <div className="text-[10px] text-slate-400 mt-1">100% compliant</div>
        </Link>

        {/* Sent to Gmail */}
        <Link href="/sent-emails" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Sent to Gmail</span>
            <Send className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{stats.sentCount}</div>
          <div className="text-[10px] text-indigo-300 mt-1">{stats.confirmedDeliveries} delivered</div>
        </Link>

        {/* Multi-Touch Targets */}
        <Link href="/email-sent-plus-channels" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Sent + Channels</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 mt-2">{stats.emailSentPlusChannelsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Multi-touch follow-up</div>
        </Link>

        {/* Other Channels */}
        <Link href="/other-channels" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Other Channels</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-2">{stats.alternativeChannelsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">LinkedIn, X, Forms</div>
        </Link>

        {/* No Email Available */}
        <Link href="/no-email" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">No Email Found</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">{stats.noEmailCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Channels only</div>
        </Link>
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
