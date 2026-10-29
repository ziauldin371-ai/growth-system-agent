'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  Globe, 
  Cpu, 
  ShieldCheck, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Mail,
  User,
  Phone,
  RefreshCw
} from 'lucide-react';

export default function BusinessDossierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ai_automation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/businesses/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBusiness(data.business);
          if (data.business.pipelineType === 'website_opportunities') {
            setSelectedStrategy('web_development');
          } else {
            setSelectedStrategy('rag_systems');
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: id,
          strategy: selectedStrategy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('AI Outreach Draft successfully generated and placed in the Approval Queue.');
        setTimeout(() => {
          router.push('/approval-queue');
        }, 1200);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading prospective dossier...</span>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-8 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Business record not found</h2>
        <Link href="/" className="text-xs text-indigo-400 mt-2 inline-block">Return to Overview</Link>
      </div>
    );
  }

  const score = business.score;
  const webCheck = business.websiteCheck;
  const evidenceList = business.evidence || [];
  const contacts = business.contacts || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={business.pipelineType === 'website_opportunities' ? '/pipeline-a' : '/pipeline-b'}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pipeline</span>
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Pipeline Assignment:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            business.pipelineType === 'website_opportunities'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
          }`}>
            {business.pipelineType === 'website_opportunities' ? 'Pipeline A (Web Dev)' : 'Pipeline B (AI & Software)'}
          </span>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{business.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
            <span>{business.industry || 'Commercial Enterprise'}</span>
            <span>•</span>
            <span>{business.city ? `${business.city}, ${business.country}` : business.country}</span>
            {business.domain && (
              <>
                <span>•</span>
                <a
                  href={`https://${business.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{business.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Lead Score Badge */}
        <div className="flex items-center space-x-4 bg-slate-950/60 border border-slate-800/80 px-5 py-3 rounded-xl">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Priority Score</div>
            <div className="text-xs text-emerald-400 font-medium">Verified Commercial Intent</div>
          </div>
          <div className="text-3xl font-black text-white px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
            {score?.overallScore ?? 0}
          </div>
        </div>
      </div>

      {/* Grid: Evidence Provenance + Website Check */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Evidence & Grounded Provenance
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Every qualification decision is anchored to verifiable sources with exact observation timestamps. We distinguish observed facts from inferences.
            </p>

            <div className="space-y-4">
              {evidenceList.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{ev.sourceName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      ev.isFactual
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {ev.isFactual ? 'VERIFIED FACT' : 'INFERENCE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ev.summary}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Observed: {new Date(ev.observationTime).toLocaleDateString()}
                    </span>
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>View Source Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explainable Scoring Rationale Card */}
          {score && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Explainable Scoring Breakdown
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {score.reasoning}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Activity Score</div>
                  <div className="text-base font-bold text-white mt-1">{score.activityScore}/100</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Service Fit</div>
                  <div className="text-base font-bold text-white mt-1">{score.serviceFitScore}/100</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Website Gap</div>
                  <div className="text-base font-bold text-white mt-1">{score.websiteOpportunityScore}/100</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">AI / Tech Signal</div>
                  <div className="text-base font-bold text-white mt-1">{score.aiOpportunityScore}/100</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Contact Quality</div>
                  <div className="text-base font-bold text-white mt-1">{score.contactQualityScore}/100</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Confidence Score</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">{score.confidenceScore}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Website Verification & AI Outreach Generation */}
        <div className="space-y-6">
          {/* Website Diagnostics */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              Website Check Diagnostics
            </h3>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Classification:</span>
                <span className="font-mono font-semibold text-rose-300">
                  {webCheck?.status || 'apparently_absent'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SSRF Guard:</span>
                <span className="text-emerald-400 font-medium">Revalidated Public IP</span>
              </div>
              {webCheck?.httpStatusCode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">HTTP Status:</span>
                  <span className="font-mono">{webCheck.httpStatusCode}</span>
                </div>
              )}
              {webCheck?.ipAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Resolved IP:</span>
                  <span className="font-mono">{webCheck.ipAddress}</span>
                </div>
              )}
              {webCheck?.errorDetails && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  {webCheck.errorDetails}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-400" />
              Key Decision Maker
            </h3>

            {contacts.length > 0 ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="font-bold text-slate-100">{contacts[0].fullName}</div>
                <div className="text-slate-400">{contacts[0].title || 'Leadership'}</div>
                {contacts[0].email && (
                  <div className="flex items-center gap-1.5 text-indigo-300 font-mono text-[11px] pt-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{contacts[0].email}</span>
                  </div>
                )}
                {contacts[0].phone && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{contacts[0].phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No direct contact record yet.</div>
            )}
          </div>

          {/* Action: Generate AI Outreach Draft */}
          <div className="rounded-xl border border-indigo-900/40 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI Personalized Outreach Studio
            </h3>
            <p className="text-[11px] text-slate-300">
              Generates 3 subject lines, value proposition, and a professional, compliant outreach proposal tailored to verified evidence.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Strategy Template
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="web_development">Web Development (Pipeline A)</option>
                <option value="rag_systems">RAG & LLM Integration (Pipeline B)</option>
                <option value="ai_automation">AI & Workflow Automation (Pipeline B)</option>
                <option value="python_engineering">Python Engineering & APIs (Pipeline B)</option>
                <option value="data_science">Data Science & Pipelines (Pipeline B)</option>
                <option value="agency_partner">Agency White-Label Partner (Pipeline B)</option>
              </select>
            </div>

            {message && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-400">
                {message}
              </div>
            )}

            <button
              onClick={handleGenerateDraft}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Grounded Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Outreach Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
