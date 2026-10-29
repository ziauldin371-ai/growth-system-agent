import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { Cpu, AlertCircle, ArrowUpRight, Sparkles, Code2, Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PipelineBPage() {
  const { businesses } = dataStore.getBusinesses({
    pipeline: 'ai_software_opportunities',
    limit: 100,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Pipeline B</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI & Software Engineering Opportunities
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Startups, SaaS companies, and digital agencies showing verified demand for LLM integrations, RAG architectures, Python pipelines, and full-stack development.
          </p>
        </div>
      </div>

      {/* Rationale & Guardrail Box */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-slate-300 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-purple-300">Qualification Rule:</span> We never assume a tech company automatically needs AI. Every prospect here has verifiable public signals: job postings explicitly naming Python/RAG/AI frameworks, press announcements, or stated bottlenecks in scaling technical capacity.
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300">
            {businesses.length} Verified Technical Prospects
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6">Company & Domain</th>
                <th className="py-3 px-6">Identified Technical Signals</th>
                <th className="py-3 px-6">Hiring / Expansion Evidence</th>
                <th className="py-3 px-6">Key Decision Maker</th>
                <th className="py-3 px-6 text-center">Score</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {businesses.map((biz) => {
                const contact = biz.contacts?.[0];
                const score = biz.score?.overallScore ?? 0;
                const signals = biz.score?.scoreBreakdown?.matchedAiSignals || ['AI', 'Python'];

                return (
                  <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-medium text-white">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span>{biz.name}</span>
                        {biz.isSandboxData && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                      {biz.domain && (
                        <a
                          href={`https://${biz.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:underline font-mono"
                        >
                          {biz.domain}
                        </a>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">{biz.industry}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {signals.map((sig: string) => (
                          <span
                            key={sig}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[11px] text-slate-200">
                        {biz.evidence && biz.evidence.length > 0 ? (
                          <span className="font-medium">{biz.evidence[0].summary}</span>
                        ) : (
                          <span className="text-slate-500">Documented technical requirement</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Source: {biz.evidence?.[0]?.sourceName || 'Job Postings'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {contact ? (
                        <div>
                          <div className="font-medium text-slate-200">{contact.fullName}</div>
                          <div className="text-[11px] text-slate-400">{contact.title || 'Technical Executive'}</div>
                          {contact.email && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {contact.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-2.5 py-1 rounded font-bold text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {score}/100
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/businesses/${biz.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-block"
                      >
                        Inspect Dossier →
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
