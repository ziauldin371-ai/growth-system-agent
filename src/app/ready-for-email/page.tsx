'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  MailCheck, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  ArrowRight,
  Globe,
  Cpu,
  Building,
  UserCheck
} from 'lucide-react';

export default function ReadyForEmailPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReady() {
      try {
        const res = await fetch('/api/leads/ready');
        const data = await res.json();
        if (data.success) {
          setItems(data.leads);
        }
      } catch (err) {
        console.error('Failed to load ready leads:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReady();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span>Ready for Email Queue</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Contacts that satisfy 100% of automated outreach criteria: verified identity, score &ge; 60, unsuppressed, and grounded service fit.
          </p>
        </div>
        <div>
          <Link
            href="/approval-queue"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <MailCheck className="w-4 h-4" />
            <span>Open Approval Queue</span>
          </Link>
        </div>
      </div>

      {/* Criteria Info Banner */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-emerald-200">Autonomous Eligibility Standard</div>
          <p className="text-emerald-300/90 leading-relaxed">
            Every prospect shown below has passed statutory compliance checks (CAN-SPAM/GDPR), verified email deliverability, zero suppression flags, and demonstrable business need for Zia Ul Din&apos;s development services.
          </p>
        </div>
      </div>

      {/* Grid of Ready Leads */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading eligible outreach targets...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No leads currently in the eligible queue. Run discovery to populate new prospective clients.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item, idx) => {
            const { business, contact, score, draft, reasons } = item;

            return (
              <div 
                key={idx}
                className="p-5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-4 hover:border-slate-700 transition-all shadow-lg"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-100">{business.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {business.country}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {business.city ? `${business.city}, ${business.region || ''} • ` : ''}
                      {business.industry}
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-xs font-bold">
                      {score.overallScore}/100
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">ICP Score</span>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                      {contact.firstName ? contact.firstName[0] : 'C'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{contact.fullName}</div>
                      <div className="text-[11px] text-slate-400">{contact.title || 'Decision Maker'}</div>
                    </div>
                  </div>
                  <div className="font-mono text-emerald-400 text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    {contact.email}
                  </div>
                </div>

                {/* Eligibility Explanations */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Verified Eligibility Criteria
                  </div>
                  <div className="space-y-1">
                    {reasons.map((r: string, rIdx: number) => (
                      <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Draft Status / CTA */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {draft ? (
                      <span className="text-indigo-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Draft Generated &bull; Ready for Approval
                      </span>
                    ) : (
                      <span className="text-slate-500">Draft awaiting synthesis</span>
                    )}
                  </div>
                  <Link
                    href="/approval-queue"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <span>Review in Queue</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

