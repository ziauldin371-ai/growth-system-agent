import Link from 'next/link';
import { dataStore } from '@/services/repository/data-store';
import { Globe, AlertCircle, ArrowUpRight, Sparkles, Phone, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PipelineAPage() {
  const { businesses } = dataStore.getBusinesses({
    pipeline: 'website_opportunities',
    limit: 100,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Needs a website</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Website Opportunities
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Active, verified commercial businesses operating with customer transactions or physical footprints but lacking a verified functional website.
          </p>
        </div>
      </div>

      {/* Rationale & Guardrail Box */}
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-slate-300 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-cyan-300">Qualification Rule:</span> We never assume a business without a website automatically needs or can afford development. Every qualified lead here displays verified evidence of customer reviews, statutory corporate registration, or physical branch operations.
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300">
            {businesses.length} Qualified Candidates Identified
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6">Business Name</th>
                <th className="py-3 px-6">Website Status</th>
                <th className="py-3 px-6">Commercial Evidence</th>
                <th className="py-3 px-6">Primary Contact</th>
                <th className="py-3 px-6 text-center">Score</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {businesses.map((biz) => {
                const webCheck = biz.websiteCheck;
                const contact = biz.contacts?.[0];
                const score = biz.score?.overallScore ?? 0;

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
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{biz.city || biz.country}</span>
                        <span>•</span>
                        <span>{biz.industry}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        {webCheck?.status || 'No website found'}
                      </span>
                      {webCheck?.errorDetails && (
                        <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate">
                          {webCheck.errorDetails}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[11px] text-slate-200">
                        {biz.evidence && biz.evidence.length > 0 ? (
                          <span className="font-medium">{biz.evidence[0].summary}</span>
                        ) : (
                          <span className="text-slate-500">Commercial register record</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Source: {biz.evidence?.[0]?.sourceName || biz.sourceProvider}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {contact ? (
                        <div>
                          <div className="font-medium text-slate-200">{contact.fullName}</div>
                          <div className="text-[11px] text-slate-400">{contact.title || 'Decision Maker'}</div>
                          {contact.phone && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-2.5 py-1 rounded font-bold text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {score}/100
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/businesses/${biz.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-block"
                      >
                        View details →
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
