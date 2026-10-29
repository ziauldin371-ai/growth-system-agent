'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Share2, 
  ExternalLink, 
  Copy, 
  Check, 
  Building, 
  Globe, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Facebook, 
  Youtube, 
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  Slash
} from 'lucide-react';

export default function OtherOutreachPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<any[] | null>(null);

  const handleChannelAction = async (channelId: string, action: 'mark_contacted' | 'lock_opt_out') => {
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      loadOpportunities();
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    }
  };

  const loadOpportunities = async () => {
    try {
      const res = await fetch('/api/leads/other-channels');
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error('Failed to load other channels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleCopyPitch = (id: string, pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (channelId: string, status: string) => {
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadOpportunities();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-sky-400" />;
      case 'twitter':
        return <Twitter className="w-4 h-4 text-cyan-400" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'facebook':
        return <Facebook className="w-4 h-4 text-blue-400" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'contact_form':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <Globe className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Share2 className="w-6 h-6 text-cyan-400" />
            <span>Other Outreach Opportunities</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Businesses with legitimately discovered professional channels beyond email (LinkedIn, X, Instagram, Web Contact Forms). Tailored pitches ready for manual connection.
          </p>
        </div>

        <div>
          <Link
            href="/email-sent-plus-channels"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <span>View Emailed + Other Channels &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Grid of Opportunities */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading multi-channel opportunities...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
          No alternative channel records currently found.
        </div>
      ) : (
        <div className="space-y-6">
          {opportunities.map((item, idx) => {
            const { business, channels } = item;

            return (
              <div 
                key={idx}
                className="p-6 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 space-y-5 shadow-xl"
              >
                {/* Business Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-100">{business.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono text-slate-300">
                        {business.country}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {business.city ? `${business.city}, ` : ''}{business.industry}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-400 font-semibold">
                      ICP Score: {business.score?.overallScore || 'N/A'}/100
                    </span>
                    <Link
                      href={`/businesses/${business.id}`}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <span>Dossier</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  </div>
                </div>

                {/* Channels Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {channels.map((ch: any) => {
                    const isCopied = copiedId === ch.id;

                    return (
                      <div
                        key={ch.id}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3 flex flex-col justify-between"
                      >
                        {/* Channel Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                              {getPlatformIcon(ch.platform)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-200 capitalize">
                                  {ch.platform.replace('_', ' ')}
                                </span>
                                {ch.isVerifiedMatch ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>Verified</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    <span>Unverified Match</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                                {ch.handleOrIdentifier || ch.sourceName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {ch.evidenceSources && ch.evidenceSources.length > 0 && (
                              <button
                                onClick={() => setActiveEvidence(ch.evidenceSources)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs"
                                title="View Evidence Citations"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={ch.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                            >
                              <span>Open Profile</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          </div>
                        </div>

                        {ch.isLockedOptOut ? (
                          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
                            <Slash className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Outreach Locked: Business has opted out or requested no contact.</span>
                          </div>
                        ) : (
                          <>
                            {/* Tailored Pitch Box */}
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300 relative group">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Tailored Pitch ({ch.platform})</span>
                                </span>
                                <span className="text-slate-500 font-mono">
                                  {ch.customPitch.length} chars
                                </span>
                              </div>
                              <p className="line-clamp-4 leading-relaxed font-sans text-slate-300">
                                {ch.customPitch}
                              </p>
                            </div>

                            {ch.nextTouchEligibleAt && new Date(ch.nextTouchEligibleAt).getTime() > Date.now() && (
                              <div className="px-2.5 py-1 rounded bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-300 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                <span>3-Day Cross-Channel Spacing Active: Next touch eligible {new Date(ch.nextTouchEligibleAt).toLocaleDateString()}</span>
                              </div>
                            )}

                            {/* Action Toolbar */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleCopyPitch(ch.id, ch.customPitch)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                                    isCopied
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-slate-400" />
                                      <span>Copy Pitch</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleChannelAction(ch.id, 'mark_contacted')}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                                  title="Mark as manually sent & start 3-day quiet period"
                                >
                                  Mark Contacted
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleChannelAction(ch.id, 'lock_opt_out')}
                                  className="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-900/50 text-[11px]"
                                  title="Lock all channels for this company (Do Not Contact)"
                                >
                                  Opt Out / Lock
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Evidence Citations Modal */}
      {activeEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Verified Evidence Citations</span>
              </h3>
              <button
                onClick={() => setActiveEvidence(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {activeEvidence.map((ev, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="font-semibold text-cyan-400">{ev.sourceName}</div>
                  <div className="text-slate-300">{ev.summary}</div>
                  {ev.sourceUrl && (
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline text-[11px] inline-flex items-center gap-1 mt-1"
                    >
                      <span>View Source Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

